/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.control_desk.websocket;

import com.control_desk.modules.group.ChatMessage;
import com.control_desk.security.AuthUser;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.websocket.CloseReason;
import jakarta.websocket.Session;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;

@ApplicationScoped
public class GroupChatService {
    private static final DateTimeFormatter API_DATE_TIME =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private final ConcurrentHashMap<Integer, ChatRoom> rooms =
            new ConcurrentHashMap<>();

    private final AtomicLong nextMessageId =
            new AtomicLong(1);

    public void join(
            int groupId,
            AuthUser user,
            Session session,
            int bufferSize
    ) {
        closeOtherRooms(user.personId);

        session.getUserProperties().put("groupId", groupId);
        session.getUserProperties().put("personId", user.personId);

        room(groupId)
                .sessions
                .add(session);

        send(
                session,
                historyPayload(
                        groupId,
                        history(groupId, bufferSize)
                )
        );
    }

    public void leave(Session session) {
        Object groupId =
                session.getUserProperties().get("groupId");

        if (!(groupId instanceof Integer id)) {
            return;
        }

        ChatRoom room =
                rooms.get(id);

        if (room == null) {
            return;
        }

        room.sessions.remove(session);
    }

    public void post(
            int groupId,
            AuthUser user,
            String personThumbnail,
            String personRole,
            String message,
            String fileName,
            String fileType,
            String fileData,
            Integer fileSize,
            int bufferSize
    ) {
        ChatMessage chatMessage =
                new ChatMessage();

        chatMessage.id =
                nextMessageId.getAndIncrement();
        chatMessage.groupId =
                groupId;
        chatMessage.personId =
                user.personId;
        chatMessage.personName =
                user.name;
        chatMessage.personThumbnail =
                personThumbnail;
        chatMessage.personRole =
                personRole;
        chatMessage.message =
                message;
        chatMessage.fileName =
                fileName;
        chatMessage.fileType =
                fileType;
        chatMessage.fileData =
                fileData;
        chatMessage.fileSize =
                fileSize;
        chatMessage.createdOn =
                LocalDateTime
                        .now()
                        .format(API_DATE_TIME);

        ChatRoom room =
                room(groupId);

        room.messages.add(chatMessage);
        trim(room, bufferSize);

        broadcast(
                room,
                messagePayload(chatMessage)
        );
    }

    public List<ChatMessage> history(
            int groupId,
            int bufferSize
    ) {
        List<ChatMessage> messages =
                new ArrayList<>(
                        room(groupId).messages
                );

        messages.sort(
                Comparator.comparing(message -> message.id)
        );

        int start =
                Math.max(0, messages.size() - bufferSize);

        return messages.subList(
                start,
                messages.size()
        );
    }

    public void sendError(Session session, String message) {
        send(
                session,
                "{\"type\":\"error\",\"message\":\"" + json(message) + "\"}"
        );
    }

    private ChatRoom room(int groupId) {
        return rooms.computeIfAbsent(
                groupId,
                key -> new ChatRoom()
        );
    }

    private void trim(ChatRoom room, int bufferSize) {
        while (room.messages.size() > bufferSize) {
            room.messages.remove(0);
        }
    }

    private void closeOtherRooms(Integer personId) {
        if (personId == null) {
            return;
        }

        for (ChatRoom room : rooms.values()) {
            for (Session session : room.sessions) {
                Object sessionPersonId =
                        session.getUserProperties().get("personId");

                if (!personId.equals(sessionPersonId)) {
                    continue;
                }

                try {
                    session.close(
                            new CloseReason(
                                    CloseReason.CloseCodes.NORMAL_CLOSURE,
                                    "Joined another chat room"
                            )
                    );
                } catch (Exception ignored) {
                }
            }
        }
    }

    private void broadcast(ChatRoom room, String payload) {
        for (Session session : room.sessions) {
            if (!session.isOpen()) {
                room.sessions.remove(session);
                continue;
            }

            send(session, payload);
        }
    }

    private void send(Session session, String payload) {
        if (session.isOpen()) {
            session.getAsyncRemote().sendText(payload);
        }
    }

    private String historyPayload(
            int groupId,
            List<ChatMessage> messages
    ) {
        List<String> payloads =
                new ArrayList<>();

        for (ChatMessage message : messages) {
            payloads.add(messageJson(message));
        }

        return "{\"type\":\"history\",\"groupId\":" + groupId +
                ",\"messages\":[" + String.join(",", payloads) + "]}";
    }

    private String messagePayload(ChatMessage message) {
        return "{\"type\":\"message\",\"message\":" +
                messageJson(message) +
                "}";
    }

    private String messageJson(ChatMessage message) {
        return "{"
                + "\"id\":" + message.id + ","
                + "\"groupId\":" + message.groupId + ","
                + "\"personId\":" + message.personId + ","
                + "\"personName\":\"" + json(message.personName) + "\","
                + "\"personThumbnail\":\"" + json(message.personThumbnail) + "\","
                + "\"personRole\":\"" + json(message.personRole) + "\","
                + "\"message\":\"" + json(message.message) + "\","
                + "\"fileName\":\"" + json(message.fileName) + "\","
                + "\"fileType\":\"" + json(message.fileType) + "\","
                + "\"fileData\":\"" + json(message.fileData) + "\","
                + "\"fileSize\":" + (message.fileSize == null ? 0 : message.fileSize) + ","
                + "\"createdOn\":\"" + json(message.createdOn) + "\""
                + "}";
    }

    private String json(String value) {
        return value == null
                ? ""
                : value
                        .replace("\\", "\\\\")
                        .replace("\"", "\\\"")
                        .replace("\r", "\\r")
                        .replace("\n", "\\n");
    }

    private static final class ChatRoom {
        private final List<ChatMessage> messages =
                new CopyOnWriteArrayList<>();

        private final Set<Session> sessions =
                Collections.newSetFromMap(
                        new ConcurrentHashMap<>()
                );
    }
}
