# Video Conference Module

The Video Conference module provides scheduled, access-controlled video coordination for DRMCD users. It combines conference scheduling, participant management, live WebRTC video, screen sharing, and an in-conference chat channel for operational coordination.

## Technologies Used

- WebRTC is used for browser-to-browser audio, video, and screen-sharing media.
- WebSocket is used for VC signaling, participant state updates, and VC chat messages.
- STUN is configured in the frontend through `stun:stun.l.google.com:19302` so browsers can discover network paths for WebRTC peer connections.
- TURN is not currently configured in the code, but it is the usual production addition when participants may be behind strict firewalls or NAT. A TURN server can relay WebRTC media when direct peer-to-peer connectivity fails.
- REST APIs are used for scheduling, participant management, access checks, VC rules/help, and upcoming VC status.
- The browser MediaDevices APIs are used for camera/microphone access, screen sharing, and screen capture attachments.

## Features

### Scheduling and Participant Management

- Users can schedule a VC with title, scheduled time, duration, and participants.
- The creator is automatically added as a participant.
- Participants can be viewed from the VC list.
- The header StatusPanel can show upcoming VCs for the logged-in user.
- Participants receive notifications when a VC is scheduled or updated.

### Live VC

- VC rooms support camera and microphone.
- Users can mute/unmute audio.
- Users can turn camera on/off.
- Users can share their screen during the VC.
- Remote participant state is shown through small status badges for muted audio, camera off, and screen sharing.
- The VC room uses WebRTC for browser-to-browser media and a WebSocket only for signaling.

### VC Chat

- Each VC room has a separate chat panel.
- Chat supports live text messages.
- Users can attach files to chat messages.
- Users can capture the screen and send the capture as a PNG attachment.
- Attached files can be opened or downloaded by participants.
- Chat limits are controlled by app settings:
  - `chatMsgBufferSize`
  - `chatMsgMaxSize`
  - `chatFileMaxSize`

### Access Control

- REST APIs require a logged-in person.
- Normal users only see VCs where they are participants.
- SuperAdmin can see all VCs.
- Only the creator can update the VC schedule and participants.
- The creator cannot be removed from participants.
- VC room entry is allowed only for participants and only inside the configured join window.
- Delete is allowed for the creator or SuperAdmin, but is blocked near the scheduled VC window.
- Chat socket access is allowed only for VC participants.

## Architecture

### Frontend

Main UI files:

- `frontend/src/modules/VideoConference/VCList.jsx`
- `frontend/src/modules/VideoConference/VCEditorPage.jsx`
- `frontend/src/modules/VideoConference/VCRoom.jsx`
- `frontend/src/modules/VideoConference/VCChatPanel.jsx`
- `frontend/src/modules/VideoConference/VCHelpDialog.jsx`

Service files:

- `frontend/src/services/vcService.js`
- `frontend/src/services/vcSocket.js`
- `frontend/src/services/vcChatSocket.js`

`VCList` loads and displays conferences, opens the scheduler/editor, opens participants, and opens the live VC room. `VCEditorPage` handles scheduling and participant selection. `VCRoom` handles camera, microphone, screen sharing, WebRTC peer connections, and signaling events. `VCChatPanel` handles chat history, message sending, file upload, and screen capture attachment.

### Backend REST Layer

Main files:

- `src/main/java/com/rssd/services/VideoConferenceREST.java`
- `src/main/java/com/rssd/modules/videoconference/VideoConferenceDao.java`
- `src/main/java/com/rssd/modules/videoconference/VideoConference.java`
- `src/main/java/com/rssd/modules/videoconference/VcParticipantRequest.java`

REST endpoints manage scheduling, updates, participant changes, delete rules, one-to-one VC creation, upcoming VC status, and VC help/rules. The DAO stores VC records in `video_conference` and participant records in `vc_participants`.

Important REST endpoints:

- `GET /video-conferences`
- `GET /video-conferences/upcoming`
- `GET /video-conferences/help`
- `POST /video-conferences`
- `PUT /video-conferences`
- `DELETE /video-conferences/{id}`
- `POST /video-conferences/{id}/participants`
- `DELETE /video-conferences/{id}/participants/{personId}`

### VC Signaling

Main files:

- `src/main/java/com/rssd/websocket/VideoCallSocket.java`
- `src/main/java/com/rssd/websocket/VideoCallService.java`
- `frontend/src/services/vcSocket.js`
- `frontend/src/modules/VideoConference/VCRoom.jsx`

Socket endpoint:

- `/persons/video/socket?conferenceId=...&token=...`

The signaling socket authenticates the user, checks whether the user can start or join the conference, then joins an in-memory call room. It relays WebRTC signaling messages such as `offer`, `answer`, `ice-candidate`, `call-ready`, `hangup`, and media state changes. Actual audio/video media does not pass through the server.

### VC Chat

Main files:

- `src/main/java/com/rssd/websocket/VCChatSocket.java`
- `src/main/java/com/rssd/websocket/GroupChatService.java`
- `frontend/src/services/vcChatSocket.js`
- `frontend/src/modules/VideoConference/VCChatPanel.jsx`

Socket endpoint:

- `/video-conferences/chat/socket?conferenceId=...&token=...`

The chat socket authenticates the user, verifies conference participation, joins an in-memory room for that conference, sends recent history on connect, and broadcasts new messages to connected participants. Attachments are sent as base64 data with file metadata.

### Status and Notifications

Main files:

- `src/main/java/com/rssd/websocket/NotificationSocket.java`
- `frontend/src/app/StatusPanel.jsx`

When a VC is scheduled, updated, or deleted, participants are notified through the notification/status socket. The same status flow updates the upcoming VC count shown in the header.
