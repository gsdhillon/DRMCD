/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.rssd.websocket;

import com.rssd.modules.person.Person;
import com.rssd.modules.person.PersonDao;
import com.rssd.modules.videoconference.VideoConferenceDao;
import com.rssd.security.AuthUser;
import com.rssd.security.JwtService;
import jakarta.inject.Inject;
import jakarta.json.Json;
import jakarta.json.JsonObject;
import jakarta.websocket.CloseReason;
import jakarta.websocket.OnClose;
import jakarta.websocket.OnMessage;
import jakarta.websocket.OnOpen;
import jakarta.websocket.Session;
import jakarta.websocket.server.ServerEndpoint;

import java.io.StringReader;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Set;

@ServerEndpoint("/persons/video/socket")
public class VideoCallSocket {
    private static final Set<String> RELAY_TYPES =
            Set.of(
                    "call-ready",
                    "offer",
                    "answer",
                    "ice-candidate",
                    "hangup",
                    "media-state",
                    "screen-share-started",
                    "screen-share-stopped"
            );

    @Inject
    JwtService jwtService;

    @Inject
    PersonDao personDao;

    @Inject
    VideoConferenceDao videoConferenceDao;

    @Inject
    VideoCallService videoCallService;

    @OnOpen
    public void open(Session session) {
        AuthUser user =
                jwtService.verify(
                        query(session.getRequestURI(), "token")
                );

        int conferenceId =
                intQuery(
                        session.getRequestURI(),
                        "conferenceId"
                );

        if (
                user == null ||
                user.personId == null
        ) {
            close(
                    session,
                    CloseReason.CloseCodes.VIOLATED_POLICY,
                    "Unauthorized"
            );
            return;
        }

        if (conferenceId > 0) {
            if (!videoConferenceDao.canStart(conferenceId, user.personId)) {
                close(
                        session,
                        CloseReason.CloseCodes.VIOLATED_POLICY,
                        "Conference is not available"
                );
                return;
            }

            session.getUserProperties().put("user", user);
            session.getUserProperties().put("mode", "conference");
            session.setMaxTextMessageBufferSize(262144);

            videoCallService.joinConference(
                    conferenceId,
                    user,
                    session
            );
            return;
        }

        int peerId =
                intQuery(
                        session.getRequestURI(),
                        "peerId"
                );

        if (
                peerId < 1 ||
                peerId == user.personId
        ) {
            close(
                    session,
                    CloseReason.CloseCodes.VIOLATED_POLICY,
                    "Unauthorized"
            );
            return;
        }

        Person peer =
                personDao.getById(peerId);

        if (peer == null) {
            close(
                    session,
                    CloseReason.CloseCodes.CANNOT_ACCEPT,
                    "Person not found"
            );
            return;
        }

        session.getUserProperties().put("user", user);
        session.getUserProperties().put("mode", "person");
        session.setMaxTextMessageBufferSize(262144);

        videoCallService.join(
                peerId,
                user,
                session
        );
    }

    @OnMessage
    public void message(String payload, Session session) {
        AuthUser user =
                (AuthUser) session.getUserProperties().get("user");

        if (user == null || user.personId == null) {
            close(
                    session,
                    CloseReason.CloseCodes.VIOLATED_POLICY,
                    "Unauthorized"
            );
            return;
        }

        JsonObject message =
                parse(payload);

        if (message == null) {
            videoCallService.sendError(
                    session,
                    "Invalid call message."
            );
            return;
        }

        String type =
                message.getString("type", "");

        if (!RELAY_TYPES.contains(type)) {
            videoCallService.sendError(
                    session,
                    "Unsupported call message."
            );
            return;
        }

        if ("conference".equals(session.getUserProperties().get("mode"))) {
            videoCallService.relayConference(
                    session,
                    message
            );
        } else {
            videoCallService.relay(
                    session,
                    message
            );
        }
    }

    @OnClose
    public void close(Session session, CloseReason reason) {
        videoCallService.leave(session);
    }

    private JsonObject parse(String payload) {
        if (payload == null || payload.isBlank()) {
            return null;
        }

        try {
            return Json
                    .createReader(
                            new StringReader(payload)
                    )
                    .readObject();
        } catch (Exception error) {
            return null;
        }
    }

    private String query(URI uri, String key) {
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

    private int intQuery(URI uri, String key) {
        try {
            return Integer.parseInt(
                    query(uri, key)
            );
        } catch (NumberFormatException error) {
            return 0;
        }
    }

    private void close(
            Session session,
            CloseReason.CloseCode code,
            String reason
    ) {
        try {
            session.close(
                    new CloseReason(code, reason)
            );
        } catch (Exception ignored) {
        }
    }
}
