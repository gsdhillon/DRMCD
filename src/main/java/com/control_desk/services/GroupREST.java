/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.control_desk.services;

import com.control_desk.modules.group.Group;
import com.control_desk.modules.group.GroupDao;
import com.control_desk.modules.group.GroupMember;
import com.control_desk.modules.notification.NotificationDao;
import com.control_desk.modules.person.Person;
import com.control_desk.modules.person.PersonDao;
import com.control_desk.security.AuthContext;
import com.control_desk.websocket.NotificationSocket;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Path("/groups")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class GroupREST {
    @Inject
    GroupDao service;

    @Inject
    NotificationDao notificationDao;

    @Inject
    PersonDao personDao;

    @Inject
    AuthContext authContext;

    @GET
    public List<Group> getAll() {
        return service.getAll(
                authContext.isAdmin(),
                authContext.personId()
        );
    }

    @GET
    @Path("/{id}")
    public Group getById(@PathParam("id") int id) {
        Group group =
                service.getById(
                        id,
                        authContext.isAdmin(),
                        authContext.personId()
                );

        if (group == null) {
            throw new NotFoundException();
        }

        return group;
    }

    @GET
    @Path("/{id}/persons")
    public List<GroupMember> getMembers(@PathParam("id") int id) {
        Group group =
                service.getById(
                        id,
                        authContext.isAdmin(),
                        authContext.personId()
                );

        if (group == null) {
            throw new NotFoundException();
        }

        return group.members;
    }

    @POST
    public Group create(Group group) {
        requireAdmin();

        Group created =
                service.create(
                group,
                authContext.personId()
        );

        notifyAddedMembers(
                created,
                created.members
        );

        return created;
    }

    @PUT
    public Group update(Group group) {
        requireAdmin();

        List<GroupMember> previousMembers =
                service.getMembers(group.id);

        Group updated =
                service.update(
                group,
                authContext.personId()
        );

        notifyMembershipChanges(
                updated,
                previousMembers,
                updated.members
        );

        return updated;
    }

    @DELETE
    @Path("/{id}")
    public void delete(@PathParam("id") int id) {
        requireAdmin();
        service.delete(id);
    }

    private void requireAdmin() {
        if (!authContext.isAdmin()) {
            throw new WebApplicationException(
                    Response.Status.FORBIDDEN
            );
        }
    }

    private void notifyMembershipChanges(
            Group group,
            List<GroupMember> previousMembers,
            List<GroupMember> nextMembers
    ) {
        Set<Integer> previousIds =
                memberIds(previousMembers);

        Map<Integer, GroupMember> nextByPerson =
                memberMap(nextMembers);

        for (GroupMember member : nextMembers) {
            if (member.pId != null && !previousIds.contains(member.pId)) {
                notifyMembershipChange(
                        member.pId,
                        group.name,
                        "Added to Group"
                );
            }
        }

        Set<Integer> nextIds =
                nextByPerson.keySet();

        for (GroupMember member : previousMembers) {
            if (member.pId != null && !nextIds.contains(member.pId)) {
                notifyMembershipChange(
                        member.pId,
                        group.name,
                        "Removed from Group"
                );
            }
        }
    }

    private void notifyAddedMembers(
            Group group,
            List<GroupMember> members
    ) {
        for (GroupMember member : members) {
            if (member.pId != null) {
                notifyMembershipChange(
                        member.pId,
                        group.name,
                        "Added to Group"
                );
            }
        }
    }

    private Set<Integer> memberIds(List<GroupMember> members) {
        return members
                .stream()
                .map(member -> member.pId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    private Map<Integer, GroupMember> memberMap(List<GroupMember> members) {
        return members
                .stream()
                .filter(member -> member.pId != null)
                .collect(Collectors.toMap(
                        member -> member.pId,
                        member -> member,
                        (first, second) -> first
                ));
    }

    private void notifyMembershipChange(
            int personId,
            String groupName,
            String action
    ) {
        notificationDao.createForGroupMembership(
                personId,
                groupName,
                action,
                currentUserName()
        );
        NotificationSocket.notifyPerson(personId);
    }

    private String currentUserName() {
        Integer personId =
                authContext.personId();

        if (personId == null) {
            return "";
        }

        Person person =
                personDao.getById(personId);

        if (person == null || person.name == null) {
            return String.valueOf(personId);
        }

        return person.name;
    }
}
