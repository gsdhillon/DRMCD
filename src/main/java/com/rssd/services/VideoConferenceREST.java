/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.rssd.services;

import com.rssd.modules.notification.NotificationDao;
import com.rssd.modules.person.Person;
import com.rssd.modules.person.PersonDao;
import com.rssd.modules.settings.Settings;
import com.rssd.modules.videoconference.VcParticipantRequest;
import com.rssd.modules.videoconference.VideoConference;
import com.rssd.modules.videoconference.VideoConferenceDao;
import com.rssd.modules.settings.SettingsDao;
import com.rssd.security.AuthContext;
import com.rssd.websocket.NotificationSocket;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.time.LocalDateTime;
import java.util.ArrayList;

@Path("/video-conferences")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class VideoConferenceREST {
    @Inject
    VideoConferenceDao service;

    @Inject
    PersonDao personDao;

    @Inject
    SettingsDao settingsDao;

    @Inject
    NotificationDao notificationDao;

    @Inject
    AuthContext authContext;

    @GET
    public List<VideoConference> getAll() {
        int personId = requirePersonId();
        return authContext.isSuperAdmin()
                ? service.getAll(personId)
                : service.getForPerson(personId);
    }

    @GET
    @Path("/upcoming")
    public List<VideoConference> getUpcoming() {
        int personId = requirePersonId();
        return service.getUpcomingForPerson(personId, 5);
    }

    @GET
    @Path("/help")
    public VcHelp getHelp() {
        Settings settings =
                settingsDao == null
                        ? new Settings()
                        : settingsDao.get();

        int earlyStartMins =
                normalized(settings.vcEarlyStartMins, 5, 0);
        int pastMins =
                normalized(settings.vcPastMins, 5, 0);
        int maxDuration =
                normalized(settings.vcMaxDuration, 240, 1);
        int extendedTime =
                normalized(settings.vcExtededTime, 10, 0);
        int endAlertInterval =
                normalized(settings.vcEndAlertIntrval, 5, 1);

        VcHelp help =
                new VcHelp();
        help.title =
                "Video Conference Rules";
        help.rules.add("Scheduled time is required.");
        help.rules.add("Scheduled time cannot be earlier than " + pastMins + " minute(s) before the current server time.");
        help.rules.add("Duration is required and must be at least 1 minute.");
        help.rules.add("Duration cannot be more than " + maxDuration + " minute(s).");
        help.rules.add("VC can be started only from " + earlyStartMins + " minute(s) before the scheduled time.");
        help.rules.add("VC room entry is allowed until " + extendedTime + " minute(s) after the scheduled end time.");
        help.rules.add("The creator is automatically added as a participant.");
        help.rules.add("Only the creator can update the schedule and participants.");
        help.rules.add("The creator cannot be removed from participants.");
        help.rules.add("Delete is blocked from " + earlyStartMins + " minute(s) before schedule until " + earlyStartMins + " minute(s) after scheduled duration.");
        help.rules.add("End alert interval is configured as " + endAlertInterval + " minute(s).");
        return help;
    }

    @GET
    @Path("/{id}")
    public VideoConference getById(@PathParam("id") int id) {
        int personId = requirePersonId();
        requireParticipant(id, personId);
        return service.getById(id, personId);
    }

    @POST
    public VideoConference create(VideoConference vc) {
        int personId = requirePersonId();
        validateConference(vc);
        VideoConference created =
                service.create(vc, personId);
        notifyParticipants(
                created,
                "Video Conference Scheduled",
                personId
        );
        return created;
    }

    @PUT
    public VideoConference update(VideoConference vc) {
        int personId = requirePersonId();
        if (vc == null || vc.id == null) {
            throw new BadRequestException("Video conference is required");
        }
        requireCreator(vc.id, personId);
        validateConference(vc);
        VideoConference updated =
                service.update(vc, personId);
        notifyParticipants(
                updated,
                "Video Conference Updated",
                personId
        );
        return updated;
    }

    @POST
    @Path("/one-to-one/{personId}")
    public VideoConference startOneToOne(@PathParam("personId") int otherPersonId) {
        int personId = requirePersonId();

        if (otherPersonId == personId || personDao.getById(otherPersonId) == null) {
            throw new BadRequestException("Person is required");
        }

        VideoConference existing =
                service.findActiveForPersons(
                        personId,
                        otherPersonId
                );

        if (existing != null) {
            return existing;
        }

        Person otherPerson =
                personDao.getById(otherPersonId);

        VideoConference vc =
                new VideoConference();
        vc.title =
                "Video Chat with " +
                        (
                                otherPerson == null ||
                                        otherPerson.name == null ||
                                        otherPerson.name.isBlank()
                                        ? "Person " + otherPersonId
                                        : otherPerson.name
                        );
        vc.scheduledAt =
                LocalDateTime.now();
        vc.durationMinutes =
                vcMaxDuration();
        Person participant =
                new Person();
        participant.id =
                otherPersonId;
        vc.participants.add(participant);

        VideoConference created =
                service.create(vc, personId);
        notifyParticipants(
                created,
                "Video Conference Scheduled",
                personId
        );
        return created;
    }

    @GET
    @Path("/one-to-one/{personId}/active")
    public VideoConference activeOneToOne(@PathParam("personId") int otherPersonId) {
        int personId = requirePersonId();

        if (otherPersonId == personId || personDao.getById(otherPersonId) == null) {
            throw new BadRequestException("Person is required");
        }

        VideoConference existing =
                service.findActiveForPersons(
                        personId,
                        otherPersonId
                );

        if (existing == null) {
            throw new NotFoundException();
        }

        return existing;
    }

    @POST
    @Path("/{id}/participants")
    public VideoConference addParticipant(@PathParam("id") int id, VcParticipantRequest request) {
        int personId = requirePersonId();
        requireCreator(id, personId);
        if (request == null || request.personId == null || personDao.getById(request.personId) == null) {
            throw new BadRequestException("Person is required");
        }
        service.addParticipant(id, request.personId);
        VideoConference updated =
                service.getById(id, personId);
        notifyParticipants(
                updated,
                "Video Conference Updated",
                personId
        );
        return updated;
    }

    @DELETE
    @Path("/{id}/participants/{personId}")
    public VideoConference removeParticipant(@PathParam("id") int id, @PathParam("personId") int removePersonId) {
        int personId = requirePersonId();
        requireCreator(id, personId);
        if (removePersonId == personId) {
            throw new BadRequestException("Creator cannot be removed");
        }
        service.removeParticipant(id, removePersonId);
        VideoConference updated =
                service.getById(id, personId);
        notifyParticipants(
                updated,
                "Video Conference Updated",
                personId
        );
        return updated;
    }

    @DELETE
    @Path("/{id}")
    public void delete(@PathParam("id") int id) {
        int personId = requirePersonId();
        VideoConference vc = service.getById(id, personId);

        if (vc == null) {
            throw new NotFoundException();
        }

        if (!authContext.isSuperAdmin() && !service.isCreator(id, personId)) {
            throw new WebApplicationException(Response.Status.FORBIDDEN);
        }

        if (isInProtectedDeleteWindow(vc)) {
            int deleteWindowMins =
                    vcEarlyStartMins();
            throw new BadRequestException(
                    "VC cannot be deleted from " + deleteWindowMins + " minutes before schedule until " + deleteWindowMins + " minutes after scheduled duration."
            );
        }

        service.delete(id);
        notifyConferenceStatus(vc);
    }

    private int requirePersonId() {
        Integer personId = authContext.personId();
        if (personId == null) {
            throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        }
        return personId;
    }

    private void requireParticipant(int vcId, int personId) {
        if (!service.isParticipant(vcId, personId)) {
            throw new WebApplicationException(Response.Status.FORBIDDEN);
        }
    }

    private void requireCreator(int vcId, int personId) {
        if (!service.isCreator(vcId, personId)) {
            throw new WebApplicationException(Response.Status.FORBIDDEN);
        }
    }

    private void validateConference(VideoConference vc) {
        if (vc == null || vc.scheduledAt == null) {
            throw new BadRequestException("Scheduled time is required");
        }

        if (vc.title == null || vc.title.trim().length() < 5) {
            throw new BadRequestException("Title must be at least 5 characters");
        }

        if (vc.scheduledAt.isBefore(LocalDateTime.now().minusMinutes(vcPastMins()))) {
            throw new BadRequestException("Scheduled time cannot be in the past");
        }

        if (vc.durationMinutes != null && vc.durationMinutes < 1) {
            throw new BadRequestException("Duration is required");
        }

        int maxDuration =
                vcMaxDuration();

        if (vc.durationMinutes != null && vc.durationMinutes > maxDuration) {
            throw new BadRequestException("Duration cannot be more than " + maxDuration + " minute(s)");
        }
    }

    private boolean isInProtectedDeleteWindow(VideoConference vc) {
        if (vc == null || vc.scheduledAt == null) {
            return false;
        }

        int duration =
                vc.durationMinutes == null || vc.durationMinutes < 1
                        ? 30
                        : vc.durationMinutes;

        LocalDateTime now =
                LocalDateTime.now();

        int deleteWindowMins =
                vcEarlyStartMins();

        return !now.isBefore(vc.scheduledAt.minusMinutes(deleteWindowMins)) &&
                !now.isAfter(vc.scheduledAt.plusMinutes(duration + deleteWindowMins));
    }

    private int vcPastMins() {
        Integer value =
                settingsDao == null
                        ? null
                        : settingsDao.get().vcPastMins;

        return value == null || value < 0
                ? 5
                : value;
    }

    private int vcEarlyStartMins() {
        Integer value =
                settingsDao == null
                        ? null
                        : settingsDao.get().vcEarlyStartMins;

        return value == null || value < 0
                ? 5
                : value;
    }

    private int vcMaxDuration() {
        Integer value =
                settingsDao == null
                        ? null
                        : settingsDao.get().vcMaxDuration;

        return value == null || value < 1
                ? 240
                : value;
    }

    private int normalized(Integer value, int fallback, int minimum) {
        return value == null || value < minimum
                ? fallback
                : value;
    }

    private void notifyParticipants(
            VideoConference conference,
            String action,
            int changedByPersonId
    ) {
        if (conference == null || conference.participants == null) {
            return;
        }

        String changedByName =
                currentUserName(changedByPersonId);

        for (Person participant : conference.participants) {
            if (participant == null || participant.id == null) {
                continue;
            }

            notificationDao.createForVideoConference(
                    participant.id,
                    conference,
                    action,
                    changedByName
            );
            NotificationSocket.notifyPerson(participant.id);
        }
    }

    private void notifyConferenceStatus(VideoConference conference) {
        if (conference == null || conference.participants == null) {
            return;
        }

        for (Person participant : conference.participants) {
            if (participant != null && participant.id != null) {
                NotificationSocket.notifyPerson(participant.id);
            }
        }
    }

    private String currentUserName(int personId) {
        Person person =
                personDao.getById(personId);

        if (person == null || person.name == null || person.name.isBlank()) {
            return String.valueOf(personId);
        }

        return person.name;
    }

    public static class VcHelp {
        public String title;
        public List<String> rules = new ArrayList<>();
    }
}
