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
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@ServerEndpoint("/settings/socket")
public class SettingsSocket {
    private static final Set<Session> SESSIONS =
            ConcurrentHashMap.newKeySet();

    @Inject
    JwtService jwtService;

    @OnOpen
    public void open(Session session) {
        AuthUser user =
                jwtService.verify(query(session.getRequestURI(), "token"));

        if (user == null || user.personId == null) {
            close(session);
            return;
        }

        SESSIONS.add(session);
    }

    @OnClose
    public void close(Session session, CloseReason reason) {
        SESSIONS.remove(session);
    }

    public static void notifySettingsChanged() {
        for (Session session : SESSIONS) {
            if (!session.isOpen()) {
                SESSIONS.remove(session);
                continue;
            }

            session.getAsyncRemote()
                    .sendText("{\"type\":\"settings-changed\"}");
        }
    }

    private static String query(URI uri, String key) {
        String query =
                uri.getQuery();

        if (query == null || query.isBlank()) {
            return "";
        }

        for (String part : query.split("&")) {
            String[] pair =
                    part.split("=", 2);

            if (pair.length == 2 && key.equals(pair[0])) {
                return URLDecoder.decode(
                        pair[1],
                        StandardCharsets.UTF_8
                );
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
