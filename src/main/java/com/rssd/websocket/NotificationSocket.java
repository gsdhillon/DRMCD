/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.rssd.websocket;

import com.rssd.security.AuthUser;
import com.rssd.security.JwtService;
import com.rssd.modules.videoconference.VideoConference;
import com.rssd.modules.videoconference.VideoConferenceDao;
import jakarta.json.Json;
import jakarta.json.JsonArrayBuilder;
import jakarta.json.JsonObjectBuilder;
import jakarta.inject.Inject;
import jakarta.websocket.CloseReason;
import jakarta.websocket.OnClose;
import jakarta.websocket.OnOpen;
import jakarta.websocket.Session;
import jakarta.websocket.server.ServerEndpoint;

import java.net.URI;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@ServerEndpoint("/notifications/socket")
public class NotificationSocket {
    private static final ConcurrentHashMap<Integer, Set<Session>> SESSIONS =
            new ConcurrentHashMap<>();

    @Inject
    JwtService jwtService;

    @Inject
    VideoConferenceDao conferenceDao;

    private static volatile VideoConferenceDao sharedConferenceDao;

    @OnOpen
    public void open(Session session) {
        AuthUser user =
                jwtService.verify(token(session.getRequestURI()));

        if (user == null || user.personId == null) {
            close(session);
            return;
        }

        session.getUserProperties().put("personId", user.personId);
        sharedConferenceDao = conferenceDao;

        SESSIONS
                .computeIfAbsent(
                        user.personId,
                        key -> ConcurrentHashMap.newKeySet()
                )
                .add(session);

        sendUpcomingConferences(session, user.personId);
    }

    @OnClose
    public void close(Session session, CloseReason reason) {
        remove(session);
    }

    public static void notifyPerson(int personId) {
        Set<Session> sessions =
                SESSIONS.getOrDefault(
                        personId,
                        Collections.emptySet()
                );

        for (Session session : sessions) {
            if (!session.isOpen()) {
                remove(session);
                continue;
            }

            session.getAsyncRemote()
                    .sendText("{\"type\":\"notification-created\"}");
            sendUpcomingConferences(session, personId);
        }
    }

    private static void sendUpcomingConferences(Session session, int personId) {
        VideoConferenceDao dao =
                sharedConferenceDao;

        if (dao == null || !session.isOpen()) {
            return;
        }

        try {
            session.getAsyncRemote()
                    .sendText(upcomingConferencesMessage(dao.getUpcomingForPerson(personId, 5)));
        } catch (Exception ignored) {
        }
    }

    private static String upcomingConferencesMessage(List<VideoConference> conferences) {
        JsonArrayBuilder items =
                Json.createArrayBuilder();

        for (VideoConference conference : conferences) {
            JsonObjectBuilder item =
                    Json.createObjectBuilder()
                            .add("id", conference.id == null ? 0 : conference.id)
                            .add("title", conference.title == null ? "" : conference.title)
                            .add("scheduledAt", conference.scheduledAt == null ? "" : conference.scheduledAt.toString())
                            .add("durationMinutes", conference.durationMinutes == null ? 0 : conference.durationMinutes)
                            .add("startAllowed", conference.startAllowed);

            items.add(item);
        }

        // Ishjyot [2026-06-01] : Push upcoming VC status on the same lightweight status socket.
        return Json.createObjectBuilder()
                .add("type", "upcoming-conferences-status")
                .add("conferences", items)
                .build()
                .toString();
    }

    private static void remove(Session session) {
        Object personId =
                session.getUserProperties().get("personId");

        if (!(personId instanceof Integer id)) {
            return;
        }

        Set<Session> sessions =
                SESSIONS.get(id);

        if (sessions == null) {
            return;
        }

        sessions.remove(session);

        if (sessions.isEmpty()) {
            SESSIONS.remove(id);
        }
    }

    private static String token(URI uri) {
        String query =
                uri.getQuery();

        if (query == null || query.isBlank()) {
            return "";
        }

        for (String part : query.split("&")) {
            String[] pair =
                    part.split("=", 2);

            if (pair.length == 2 && "token".equals(pair[0])) {
                return pair[1];
            }
        }

        return "";
    }

    private static void close(Session session) {
        try {
            session.close(
                    new CloseReason(
                            CloseReason.CloseCodes.VIOLATED_POLICY,
                            "Unauthorized"
                    )
            );
        } catch (Exception ignored) {
        }
    }
}
