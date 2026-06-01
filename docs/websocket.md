# WebSockets in DRMCD

A WebSocket is a long-lived, two-way connection between the browser and the server. Unlike normal REST calls, where the browser asks and the server replies once, a WebSocket stays open so either side can send small real-time messages whenever something changes.

For DRMCD, WebSockets are important because the application is intended for monitoring and control during radiation emergencies across the nation. In that context, operators need immediate awareness of alerts, configuration changes, upcoming coordination calls, live video-call state, and conference chat messages. WebSockets reduce delay and avoid repeated polling, which helps the desk stay synchronized during time-sensitive emergency response.

In this app, REST is still used for loading and saving normal data. WebSockets are used where the UI needs immediate updates without polling, or where two logged-in users need to exchange live call/chat messages.

## 1. Notifications, StatusPanel, and App Settings

The header status area uses WebSockets so the logged-in user can see changes without refreshing the page.

Frontend files:

- `frontend/src/app/StatusPanel.jsx`
- `frontend/src/services/notificationSocket.js`
- `frontend/src/state/AppContext.jsx`

Backend files:

- `src/main/java/com/rssd/websocket/NotificationSocket.java`
- `src/main/java/com/rssd/websocket/SettingsSocket.java`
- `src/main/java/com/rssd/services/VideoConferenceREST.java`
- `src/main/java/com/rssd/services/SettingsREST.java`

Notification/status socket:

- Endpoint: `/notifications/socket?token=...`
- Opened by `StatusPanel`.
- Authenticates the JWT token and stores the WebSocket session by `personId`.
- Sends `notification-created` when a notification changes for that person.
- Also sends `upcoming-conferences-status` with the logged-in user's upcoming VCs for the header StatusPanel.

Settings socket:

- Endpoint: `/settings/socket?token=...`
- Opened by `AppContext`.
- Sends `settings-changed` when app settings are updated.
- The browser responds by reloading settings through REST.
- This is how app-wide settings such as client dev mode, popup/message timing, VC limits, and chat limits can refresh without requiring a page reload.

Typical flow:

1. User logs in.
2. `StatusPanel` opens the notification/status socket.
3. `AppContext` opens the settings socket.
4. When a notification, upcoming VC, or app setting changes, the backend sends a small websocket message.
5. The frontend reloads the detailed data through REST or applies the status payload.

## 2. VC Signaling

Video calls use WebSockets for signaling. Signaling is not the video/audio media itself; it is the coordination needed before and during a WebRTC call.

Frontend files:

- `frontend/src/services/vcSocket.js`
- `frontend/src/modules/VideoConference/VCRoom.jsx`

Backend files:

- `src/main/java/com/rssd/websocket/VideoCallSocket.java`
- `src/main/java/com/rssd/websocket/VideoCallService.java`

Socket endpoint:

- Conference call: `/persons/video/socket?conferenceId=...&token=...`
- The same backend socket also supports direct person-to-person mode through `peerId`, if used by a frontend flow.

What it does:

- Authenticates the logged-in user from the token.
- Checks whether the user can join/start the conference.
- Creates or joins an in-memory call room.
- Relays WebRTC signaling messages between participants.

Message types used for signaling include:

- `call-ready`
- `offer`
- `answer`
- `ice-candidate`
- `hangup`
- `media-state`
- `screen-share-started`
- `screen-share-stopped`
- server messages such as `ready`, `peer-joined`, `peer-left`, and `error`

Important point: the server does not carry camera/microphone media. It relays signaling data so browsers can establish and maintain the WebRTC connection.

## 3. Chat in VC

The VC chat panel has its own WebSocket separate from VC signaling. This keeps chat messages and attachments independent from the WebRTC call-control messages.

Frontend files:

- `frontend/src/services/vcChatSocket.js`
- `frontend/src/modules/VideoConference/VCChatPanel.jsx`

Backend files:

- `src/main/java/com/rssd/websocket/VCChatSocket.java`
- `src/main/java/com/rssd/websocket/GroupChatService.java`

Socket endpoint:

- `/video-conferences/chat/socket?conferenceId=...&token=...`

What it does:

- Authenticates the user.
- Verifies that the user is a participant in the VC.
- Joins an in-memory chat room for that conference.
- Sends recent chat history when the socket opens.
- Broadcasts new chat messages to other connected participants.
- Supports file attachments by sending file name, file type, base64 file data, and file size.

Settings used by VC chat:

- `chatMsgBufferSize`: how many messages are kept in room history.
- `chatMsgMaxSize`: maximum text length.
- `chatFileMaxSize`: maximum attachment size.

The chat room is in memory, so it is suitable for live VC conversation. It is not currently a permanent database-backed chat history.
