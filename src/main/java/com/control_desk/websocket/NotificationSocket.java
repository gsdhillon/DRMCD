/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.control_desk.websocket;

import com.control_desk.security.AuthUser;
import com.control_desk.security.JwtService;
import jakarta.inject.Inject;
import jakarta.websocket.CloseReason;
import jakarta.websocket.OnClose;
import jakarta.websocket.OnOpen;
import jakarta.websocket.Session;
import jakarta.websocket.server.ServerEndpoint;

import java.net.URI;
import java.util.Collections;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@ServerEndpoint("/notifications/socket")
public class NotificationSocket {
    private static final ConcurrentHashMap<Integer, Set<Session>> SESSIONS =
            new ConcurrentHashMap<>();

    @Inject
    JwtService jwtService;

    @OnOpen
    public void open(Session session) {
        AuthUser user =
                jwtService.verify(token(session.getRequestURI()));

        if (user == null || user.personId == null) {
            close(session);
            return;
        }

        session.getUserProperties().put("personId", user.personId);

        SESSIONS
                .computeIfAbsent(
                        user.personId,
                        key -> ConcurrentHashMap.newKeySet()
                )
                .add(session);
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
        }
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
