/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.control_desk.websocket;

import com.control_desk.security.AuthUser;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.json.Json;
import jakarta.json.JsonObject;
import jakarta.json.JsonObjectBuilder;
import jakarta.websocket.CloseReason;
import jakarta.websocket.Session;

import java.io.StringWriter;
import java.util.Collections;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@ApplicationScoped
public class VideoCallService {
    private final ConcurrentHashMap<String, CallRoom> rooms =
            new ConcurrentHashMap<>();

    public void join(
            int peerId,
            AuthUser user,
            Session session
    ) {
        closeOtherCalls(user.personId);

        String roomId =
                roomId(user.personId, peerId);

        CallRoom room =
                room(roomId, user.personId, peerId);

        session.getUserProperties().put("roomId", roomId);
        session.getUserProperties().put("personId", user.personId);
        session.getUserProperties().put("peerId", peerId);
        session.getUserProperties().put("personName", user.name);

        room.sessions.add(session);

        send(
                session,
                Json.createObjectBuilder()
                        .add("type", "ready")
                        .add("roomId", roomId)
                        .add("selfPersonId", user.personId)
                        .add("peerPersonId", peerId)
                        .add("peerOnline", hasPerson(room, peerId))
                        .add("peerReady", room.readyPersonIds.contains(peerId))
                        .add("offererPersonId", room.offererPersonId)
                        .build()
        );

        broadcastExcept(
                session,
                room,
                Json.createObjectBuilder()
                        .add("type", "peer-joined")
                        .add("fromPersonId", user.personId)
                        .add("fromPersonName", safe(user.name))
                        .add("offererPersonId", room.offererPersonId)
                        .build()
        );
    }

    public void joinConference(
            int conferenceId,
            AuthUser user,
            Session session
    ) {
        closeOtherCalls(user.personId);

        String roomId =
                "vc:" + conferenceId;

        CallRoom room =
                rooms.computeIfAbsent(
                        roomId,
                        key -> new CallRoom(0)
                );

        session.getUserProperties().put("roomId", roomId);
        session.getUserProperties().put("conferenceId", conferenceId);
        session.getUserProperties().put("personId", user.personId);
        session.getUserProperties().put("personName", user.name);

        room.sessions.add(session);

        JsonObjectBuilder peers =
                Json.createObjectBuilder();

        for (Session peerSession : room.sessions) {
            Integer peerPersonId =
                    personId(peerSession);

            if (
                    peerSession == session ||
                    peerPersonId == null ||
                    !peerSession.isOpen()
            ) {
                continue;
            }

            peers.add(
                    String.valueOf(peerPersonId),
                    Json.createObjectBuilder()
                            .add("personId", peerPersonId)
                            .add(
                                    "personName",
                                    safe(
                                            String.valueOf(
                                                    peerSession.getUserProperties()
                                                            .getOrDefault("personName", "")
                                            )
                                    )
                            )
                            .add("ready", room.readyPersonIds.contains(peerPersonId))
                            .build()
            );
        }

        send(
                session,
                Json.createObjectBuilder()
                        .add("type", "ready")
                        .add("roomId", roomId)
                        .add("conferenceId", conferenceId)
                        .add("selfPersonId", user.personId)
                        .add("peers", peers.build())
                        .build()
        );

        broadcastExcept(
                session,
                room,
                Json.createObjectBuilder()
                        .add("type", "peer-joined")
                        .add("fromPersonId", user.personId)
                        .add("fromPersonName", safe(user.name))
                        .build()
        );
    }

    public void leave(Session session) {
        Object roomId =
                session.getUserProperties().get("roomId");

        if (!(roomId instanceof String id)) {
            return;
        }

        CallRoom room =
                rooms.get(id);

        if (room == null) {
            return;
        }

        room.sessions.remove(session);

        Integer personId =
                personId(session);

        if (personId != null) {
            room.readyPersonIds.remove(personId);

            broadcast(
                    room,
                    Json.createObjectBuilder()
                            .add("type", "peer-left")
                            .add("fromPersonId", personId)
                            .add(
                                    "fromPersonName",
                                    safe(
                                            String.valueOf(
                                                    session.getUserProperties()
                                                            .getOrDefault("personName", "")
                                            )
                                    )
                            )
                            .build()
            );
        }

        if (room.sessions.isEmpty()) {
            rooms.remove(id);
        }
    }

    public void relay(Session session, JsonObject message) {
        Object roomId =
                session.getUserProperties().get("roomId");

        if (!(roomId instanceof String id)) {
            sendError(session, "Call room is not open.");
            return;
        }

        CallRoom room =
                rooms.get(id);

        if (room == null) {
            sendError(session, "Call room is not open.");
            return;
        }

        Integer personId =
                personId(session);

        if (personId == null) {
            sendError(session, "Call user is not available.");
            return;
        }

        String type =
                message.getString("type", "");

        if ("call-ready".equals(type)) {
            room.readyPersonIds.add(personId);
            sendPeerReadyIfNeeded(
                    session,
                    room,
                    personId
            );
        } else if ("hangup".equals(type)) {
            room.readyPersonIds.remove(personId);
        }

        JsonObjectBuilder outbound =
                Json.createObjectBuilder()
                        .add(
                                "type",
                                type
                        )
                        .add("fromPersonId", personId)
                        .add(
                                "fromPersonName",
                                safe(
                                        String.valueOf(
                                                session.getUserProperties()
                                                        .getOrDefault("personName", "")
                                        )
                                )
                        );

        copy(message, outbound, "description");
        copy(message, outbound, "candidate");
        copyBoolean(message, outbound, "audioEnabled");
        copyBoolean(message, outbound, "videoEnabled");
        copyBoolean(message, outbound, "screenSharing");

        broadcastToPeer(
                session,
                room,
                outbound.build()
        );
    }

    public void relayConference(Session session, JsonObject message) {
        Object roomId =
                session.getUserProperties().get("roomId");

        if (!(roomId instanceof String id)) {
            sendError(session, "Conference room is not open.");
            return;
        }

        CallRoom room =
                rooms.get(id);

        if (room == null) {
            sendError(session, "Conference room is not open.");
            return;
        }

        Integer personId =
                personId(session);

        if (personId == null) {
            sendError(session, "Conference user is not available.");
            return;
        }

        String type =
                message.getString("type", "");

        if ("call-ready".equals(type)) {
            room.readyPersonIds.add(personId);
        } else if ("hangup".equals(type)) {
            room.readyPersonIds.remove(personId);
        }

        JsonObjectBuilder outbound =
                Json.createObjectBuilder()
                        .add("type", type)
                        .add("fromPersonId", personId)
                        .add(
                                "fromPersonName",
                                safe(
                                        String.valueOf(
                                                session.getUserProperties()
                                                        .getOrDefault("personName", "")
                                        )
                                )
                        );

        copy(message, outbound, "description");
        copy(message, outbound, "candidate");
        copyBoolean(message, outbound, "audioEnabled");
        copyBoolean(message, outbound, "videoEnabled");
        copyBoolean(message, outbound, "screenSharing");

        if (message.containsKey("toPersonId") && !message.isNull("toPersonId")) {
            int toPersonId =
                    message.getInt("toPersonId", 0);

            if (toPersonId > 0) {
                outbound.add("toPersonId", toPersonId);
                sendToPerson(room, toPersonId, outbound.build());
                return;
            }
        }

        broadcastExcept(
                session,
                room,
                outbound.build()
        );
    }

    private void sendPeerReadyIfNeeded(
            Session session,
            CallRoom room,
            int personId
    ) {
        Integer peerId =
                peerId(session);

        if (
                peerId == null ||
                !room.readyPersonIds.contains(peerId) ||
                !hasPerson(room, peerId)
        ) {
            return;
        }

        send(
                session,
                Json.createObjectBuilder()
                        .add("type", "call-ready")
                        .add("fromPersonId", peerId)
                        .build()
        );
    }

    public void sendError(Session session, String message) {
        send(
                session,
                Json.createObjectBuilder()
                        .add("type", "error")
                        .add("message", safe(message))
                        .build()
        );
    }

    private CallRoom room(String roomId, int onePersonId, int otherPersonId) {
        return rooms.computeIfAbsent(
                roomId,
                key -> new CallRoom(
                        Math.min(onePersonId, otherPersonId)
                )
        );
    }

    private boolean hasPerson(CallRoom room, int personId) {
        for (Session session : room.sessions) {
            if (!session.isOpen()) {
                room.sessions.remove(session);
                continue;
            }

            if (Integer.valueOf(personId).equals(personId(session))) {
                return true;
            }
        }

        return false;
    }

    private void closeOtherCalls(Integer personId) {
        if (personId == null) {
            return;
        }

        for (CallRoom room : rooms.values()) {
            for (Session session : room.sessions) {
                if (!personId.equals(personId(session))) {
                    continue;
                }

                try {
                    session.close(
                            new CloseReason(
                                    CloseReason.CloseCodes.NORMAL_CLOSURE,
                                    "Joined another video call"
                            )
                    );
                } catch (Exception ignored) {
                }
            }
        }
    }

    private void broadcastToPeer(
            Session sender,
            CallRoom room,
            JsonObject payload
    ) {
        Integer peerId =
                peerId(sender);

        if (peerId == null) {
            return;
        }

        for (Session session : room.sessions) {
            if (!session.isOpen()) {
                room.sessions.remove(session);
                continue;
            }

            if (!peerId.equals(personId(session))) {
                continue;
            }

            send(session, payload);
        }
    }

    private void sendToPerson(
            CallRoom room,
            int toPersonId,
            JsonObject payload
    ) {
        for (Session session : room.sessions) {
            if (!session.isOpen()) {
                room.sessions.remove(session);
                continue;
            }

            if (Integer.valueOf(toPersonId).equals(personId(session))) {
                send(session, payload);
            }
        }
    }

    private void broadcastExcept(
            Session sender,
            CallRoom room,
            JsonObject payload
    ) {
        for (Session session : room.sessions) {
            if (session == sender) {
                continue;
            }

            if (!session.isOpen()) {
                room.sessions.remove(session);
                continue;
            }

            send(session, payload);
        }
    }

    private void broadcast(
            CallRoom room,
            JsonObject payload
    ) {
        for (Session session : room.sessions) {
            if (!session.isOpen()) {
                room.sessions.remove(session);
                continue;
            }

            send(session, payload);
        }
    }

    private void send(Session session, JsonObject payload) {
        if (!session.isOpen()) {
            return;
        }

        StringWriter writer =
                new StringWriter();

        Json.createWriter(writer)
                .writeObject(payload);

        session.getAsyncRemote()
                .sendText(writer.toString());
    }

    private void copy(
            JsonObject source,
            JsonObjectBuilder target,
            String key
    ) {
        if (source.containsKey(key) && !source.isNull(key)) {
            target.add(key, source.get(key));
        }
    }

    private void copyBoolean(
            JsonObject source,
            JsonObjectBuilder target,
            String key
    ) {
        if (source.containsKey(key) && !source.isNull(key)) {
            target.add(key, source.getBoolean(key, false));
        }
    }

    private String roomId(int onePersonId, int otherPersonId) {
        int first =
                Math.min(onePersonId, otherPersonId);

        int second =
                Math.max(onePersonId, otherPersonId);

        return first + ":" + second;
    }

    private Integer personId(Session session) {
        Object personId =
                session.getUserProperties().get("personId");

        return personId instanceof Integer id
                ? id
                : null;
    }

    private Integer peerId(Session session) {
        Object peerId =
                session.getUserProperties().get("peerId");

        return peerId instanceof Integer id
                ? id
                : null;
    }

    private String safe(String value) {
        return value == null
                ? ""
                : value;
    }

    private static final class CallRoom {
        private final int offererPersonId;

        private final Set<Session> sessions =
                Collections.newSetFromMap(
                        new ConcurrentHashMap<>()
                );

        private final Set<Integer> readyPersonIds =
                ConcurrentHashMap.newKeySet();

        private CallRoom(int offererPersonId) {
            this.offererPersonId =
                    offererPersonId;
        }
    }
}
