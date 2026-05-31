/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.rssd.websocket;

import com.rssd.modules.person.Person;
import com.rssd.modules.person.PersonDao;
import com.rssd.modules.settings.Settings;
import com.rssd.modules.settings.SettingsDao;
import com.rssd.modules.videoconference.VideoConferenceDao;
import com.rssd.security.AuthUser;
import com.rssd.security.JwtService;
import jakarta.inject.Inject;
import jakarta.websocket.CloseReason;
import jakarta.websocket.OnClose;
import jakarta.websocket.OnMessage;
import jakarta.websocket.OnOpen;
import jakarta.websocket.Session;
import jakarta.websocket.server.ServerEndpoint;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@ServerEndpoint("/video-conferences/chat/socket")
public class VCChatSocket {
    private static final int VC_CHAT_ROOM_OFFSET = 1_000_000;

    @Inject
    JwtService jwtService;

    @Inject
    VideoConferenceDao conferenceDao;

    @Inject
    PersonDao personDao;

    @Inject
    SettingsDao settingsDao;

    @Inject
    GroupChatService chatService;

    @OnOpen
    public void open(Session session) {
        AuthUser user =
                jwtService.verify(query(session.getRequestURI(), "token"));

        int conferenceId =
                intQuery(session.getRequestURI(), "conferenceId");

        if (
                user == null ||
                user.personId == null ||
                conferenceId < 1 ||
                !conferenceDao.isParticipant(conferenceId, user.personId)
        ) {
            close(
                    session,
                    CloseReason.CloseCodes.VIOLATED_POLICY,
                    "Unauthorized"
            );
            return;
        }

        session.getUserProperties().put("user", user);
        session.getUserProperties().put("conferenceId", conferenceId);
        session.setMaxTextMessageBufferSize(chatSocketMessageMaxSize());

        Person person =
                personDao.getAuthPerson(user.personId);

        session.getUserProperties().put(
                "personThumbnail",
                person == null ? "" : person.thumbnail
        );
        session.getUserProperties().put(
                "personRole",
                person == null ? user.role : person.role
        );

        chatService.join(
                roomId(conferenceId),
                user,
                session,
                chatMsgBufferSize()
        );
    }

    @OnMessage
    public void message(String payload, Session session) {
        AuthUser user =
                (AuthUser) session.getUserProperties().get("user");

        Object conference =
                session.getUserProperties().get("conferenceId");

        if (user == null || !(conference instanceof Integer conferenceId)) {
            close(
                    session,
                    CloseReason.CloseCodes.VIOLATED_POLICY,
                    "Unauthorized"
            );
            return;
        }

        String message =
                textValue(payload, "message").trim();
        String fileName =
                textValue(payload, "fileName").trim();
        String fileType =
                textValue(payload, "fileType").trim();
        String fileData =
                textValue(payload, "fileData").trim();
        Integer fileSize =
                null;

        if (!fileData.isBlank()) {
            fileData =
                    cleanBase64(fileData);
            fileSize =
                    decodedSize(fileData);

            int fileMaxSize =
                    chatFileMaxSize();

            if (fileSize > fileMaxSize) {
                chatService.sendError(
                        session,
                        "File cannot be larger than " + fileMaxSize + " bytes."
                );
                return;
            }

            try {
                Base64
                        .getDecoder()
                        .decode(fileData);
            } catch (IllegalArgumentException error) {
                chatService.sendError(
                        session,
                        "File could not be read."
                );
                return;
            }
        }

        if (message.isBlank() && fileData.isBlank()) {
            return;
        }

        int maxSize =
                chatMsgMaxSize();

        if (message.length() > maxSize) {
            chatService.sendError(
                    session,
                    "Message cannot be longer than " + maxSize + " characters."
            );
            return;
        }

        chatService.post(
                roomId(conferenceId),
                user,
                String.valueOf(
                        session.getUserProperties()
                                .getOrDefault("personThumbnail", "")
                ),
                String.valueOf(
                        session.getUserProperties()
                                .getOrDefault("personRole", user.role)
                ),
                message,
                fileName,
                fileType,
                fileData,
                fileSize,
                chatMsgBufferSize()
        );
    }

    @OnClose
    public void close(Session session, CloseReason reason) {
        chatService.leave(session);
    }

    private int roomId(int conferenceId) {
        return VC_CHAT_ROOM_OFFSET + conferenceId;
    }

    private int chatMsgBufferSize() {
        Settings settings =
                settingsDao.get();

        return positiveOrDefault(
                settings.chatMsgBufferSize,
                50
        );
    }

    private int chatMsgMaxSize() {
        Settings settings =
                settingsDao.get();

        return positiveOrDefault(
                settings.chatMsgMaxSize,
                500
        );
    }

    private int chatFileMaxSize() {
        Settings settings =
                settingsDao.get();

        return positiveOrDefault(
                settings.chatFileMaxSize,
                1024 * 1024
        );
    }

    private int chatSocketMessageMaxSize() {
        long size =
                4096L +
                        chatMsgMaxSize() +
                        (long) chatFileMaxSize() * 2L;

        return (int) Math.min(
                Integer.MAX_VALUE,
                Math.max(8192L, size)
        );
    }

    private int positiveOrDefault(Integer value, int defaultValue) {
        return value == null || value < 1
                ? defaultValue
                : value;
    }

    private String textValue(String json, String key) {
        if (json == null || json.isBlank()) {
            return "";
        }

        String marker =
                "\"" + key + "\"";

        int keyIndex =
                json.indexOf(marker);

        if (keyIndex < 0) {
            return "";
        }

        int colonIndex =
                json.indexOf(":", keyIndex + marker.length());

        int firstQuote =
                json.indexOf("\"", colonIndex + 1);

        if (colonIndex < 0 || firstQuote < 0) {
            return "";
        }

        StringBuilder value =
                new StringBuilder();

        boolean escaped =
                false;

        for (int index = firstQuote + 1; index < json.length(); index++) {
            char current =
                    json.charAt(index);

            if (escaped) {
                value.append(
                        switch (current) {
                            case 'n' -> '\n';
                            case 'r' -> '\r';
                            case 't' -> '\t';
                            default -> current;
                        }
                );
                escaped = false;
                continue;
            }

            if (current == '\\') {
                escaped = true;
                continue;
            }

            if (current == '"') {
                break;
            }

            value.append(current);
        }

        return value.toString();
    }

    private String cleanBase64(String value) {
        int comma =
                value.indexOf(",");

        return comma >= 0
                ? value.substring(comma + 1)
                : value;
    }

    private int decodedSize(String base64) {
        if (base64.isBlank()) {
            return 0;
        }

        int padding = 0;

        if (base64.endsWith("==")) {
            padding = 2;
        } else if (base64.endsWith("=")) {
            padding = 1;
        }

        return Math.max(
                0,
                (base64.length() * 3 / 4) - padding
        );
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
