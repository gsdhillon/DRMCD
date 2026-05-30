import { useEffect, useMemo, useRef, useState } from "react";
import { useRenderDebug } from "../../app/useRenderDebug.js";
import { PersonThumbnail } from "../../common/PersonThumbnail.jsx";
import { openVCSocket } from "../../services/vcSocket.js";
import { useApp } from "../../state/AppContext.jsx";
import { VCChatPanel } from "./VCChatPanel.jsx";

const peerConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

function initialView() {
  return {
    audioEnabled: true,
    busy: false,
    error: "",
    localReady: false,
    peers: {},
    sharingScreen: false,
    chatOpen: false,
    socketReady: false,
    videoEnabled: true
  };
}

export function VCRoom({ conference, onClose }) {
  useRenderDebug("VCRoom");

  const { showError, user } = useApp();
  const selfPersonId = Number(user?.personId || user?.id || 0);
  const [view, setView] = useState(initialView);
  const [sidePanelWidth, setSidePanelWidth] = useState(28);
  const viewRef = useRef(view);
  const stageRef = useRef(null);
  const callRef = useRef({
    localStream: null,
    peerConnections: {},
    pendingCandidates: {},
    peerReady: {},
    remoteStreams: {},
    screenStream: null,
    socket: null
  });
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  function patchView(patch) {
    setView(current => ({
      ...current,
      ...(typeof patch === "function" ? patch(current) : patch)
    }));
  }

  function startResize(pointerEvent) {
    const stage = stageRef.current;

    if (!stage) {
      return;
    }

    pointerEvent.preventDefault();

    const bounds = stage.getBoundingClientRect();

    function resize(moveEvent) {
      const nextWidth = ((bounds.right - moveEvent.clientX) / bounds.width) * 100;
      setSidePanelWidth(Math.min(45, Math.max(20, nextWidth)));
    }

    function stopResize() {
      window.removeEventListener("pointermove", resize);
      window.removeEventListener("pointerup", stopResize);
    }

    window.addEventListener("pointermove", resize);
    window.addEventListener("pointerup", stopResize);
  }

  function sendSignal(payload) {
    const socket = callRef.current.socket;

    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    }
  }

  function shouldOfferTo(personId) {
    return Number(selfPersonId) < Number(personId);
  }

  function ensurePeer(data) {
    const personId = Number(data.fromPersonId || data.personId);

    if (!personId || personId === selfPersonId) {
      return;
    }

    patchView(current => {
      if (current.peers[personId]) {
        return {};
      }

      return {
        peers: {
          ...current.peers,
          [personId]: {
            personId,
            personName: data.fromPersonName || data.personName || "Person " + personId,
            audioEnabled: true,
            videoEnabled: true,
            screenSharing: false
          }
        }
      };
    });
  }

  function patchPeer(personId, patch) {
    patchView(current => ({
      peers: {
        ...current.peers,
        [personId]: {
          ...(current.peers[personId] || { personId, personName: "Person " + personId }),
          ...patch
        }
      }
    }));
  }

  function attachLocalVideo(stream) {
    if (localVideoRef.current && localVideoRef.current.srcObject !== stream) {
      localVideoRef.current.srcObject = stream;
    }
  }

  function attachRemoteVideo(personId, stream) {
    const video = remoteVideoRefs.current[personId];

    if (video && video.srcObject !== stream) {
      video.srcObject = stream;
    }
  }

  function localTracksForSend() {
    const call = callRef.current;
    const stream = viewRef.current.sharingScreen && call.screenStream
      ? call.screenStream
      : call.localStream;
    const audioTracks = call.localStream?.getAudioTracks() || [];
    const videoTracks = stream?.getVideoTracks() || [];

    return audioTracks.concat(videoTracks);
  }

  function ensurePeerConnection(personId) {
    const call = callRef.current;

    if (call.peerConnections[personId]) {
      return call.peerConnections[personId];
    }

    const connection = new RTCPeerConnection(peerConfig);
    const remoteStream = new MediaStream();

    call.peerConnections[personId] = connection;
    call.remoteStreams[personId] = remoteStream;

    localTracksForSend().forEach(track => {
      const stream = track.kind === "video" && viewRef.current.sharingScreen && call.screenStream
        ? call.screenStream
        : call.localStream;
      connection.addTrack(track, stream);
    });

    connection.ontrack = trackEvent => {
      const tracks = trackEvent.streams?.[0]?.getTracks() || [trackEvent.track];

      tracks.forEach(track => {
        if (!remoteStream.getTracks().some(existing => existing.id === track.id)) {
          remoteStream.addTrack(track);
        }
      });

      attachRemoteVideo(personId, remoteStream);
      patchPeer(personId, {
        hasStream: remoteStream.getTracks().length > 0
      });
    };

    connection.onicecandidate = event => {
      if (event.candidate) {
        sendSignal({
          type: "ice-candidate",
          toPersonId: personId,
          candidate: event.candidate.toJSON()
        });
      }
    };

    return connection;
  }

  async function createAndSendOffer(personId) {
    const connection = ensurePeerConnection(personId);

    if (connection.signalingState !== "stable") {
      return;
    }

    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    sendSignal({
      type: "offer",
      toPersonId: personId,
      description: connection.localDescription
    });
  }

  async function flushPendingCandidates(personId) {
    const call = callRef.current;
    const connection = call.peerConnections[personId];
    const candidates = call.pendingCandidates[personId] || [];

    if (!connection?.remoteDescription) {
      return;
    }

    call.pendingCandidates[personId] = [];

    for (const candidate of candidates) {
      await connection.addIceCandidate(candidate);
    }
  }

  async function receiveOffer(personId, description) {
    if (!description) {
      return;
    }

    if (!viewRef.current.localReady) {
      await startCall();
    }

    const connection = ensurePeerConnection(personId);

    await connection.setRemoteDescription(description);
    await flushPendingCandidates(personId);

    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);
    sendSignal({
      type: "answer",
      toPersonId: personId,
      description: connection.localDescription
    });
  }

  async function receiveAnswer(personId, description) {
    const connection = callRef.current.peerConnections[personId];

    if (!connection || !description || connection.signalingState === "stable") {
      return;
    }

    await connection.setRemoteDescription(description);
    await flushPendingCandidates(personId);
  }

  async function receiveIceCandidate(personId, candidate) {
    if (!candidate) {
      return;
    }

    const connection = callRef.current.peerConnections[personId];

    if (!connection?.remoteDescription) {
      callRef.current.pendingCandidates[personId] = (callRef.current.pendingCandidates[personId] || []).concat(candidate);
      return;
    }

    await connection.addIceCandidate(candidate);
  }

  async function handleSignal(data) {
    if (data.type === "ready") {
      const peers = {};

      Object.values(data.peers || {}).forEach(peer => {
        if (Number(peer.personId) !== selfPersonId) {
          peers[peer.personId] = {
            personId: peer.personId,
            personName: peer.personName,
            audioEnabled: true,
            videoEnabled: true,
            screenSharing: false
          };

          if (peer.ready) {
            callRef.current.peerReady[peer.personId] = true;
          }
        }
      });

      patchView({ peers, socketReady: true });
      return;
    }

    if (data.type === "peer-joined") {
      ensurePeer(data);
      if (viewRef.current.localReady) {
        sendSignal({ type: "call-ready" });
      }
      return;
    }

    if (data.type === "peer-left" || data.type === "hangup") {
      endPeer(data.fromPersonId);
      return;
    }

    if (data.type === "call-ready") {
      callRef.current.peerReady[data.fromPersonId] = true;
      ensurePeer(data);

      if (viewRef.current.localReady) {
        sendSignal({ type: "call-ready" });
      }

      if (viewRef.current.localReady && shouldOfferTo(data.fromPersonId)) {
        await createAndSendOffer(data.fromPersonId);
      }
      return;
    }

    if (data.type === "offer") {
      ensurePeer(data);
      await receiveOffer(data.fromPersonId, data.description);
      return;
    }

    if (data.type === "answer") {
      await receiveAnswer(data.fromPersonId, data.description);
      return;
    }

    if (data.type === "ice-candidate") {
      await receiveIceCandidate(data.fromPersonId, data.candidate);
      return;
    }

    if (data.type === "media-state") {
      ensurePeer(data);
      patchPeer(data.fromPersonId, {
        audioEnabled: data.audioEnabled !== false,
        videoEnabled: data.videoEnabled !== false,
        screenSharing: data.screenSharing === true
      });
      return;
    }

    if (data.type === "error") {
      showError(data.message || "Video conference error.");
    }
  }

  async function startCall() {
    if (viewRef.current.busy || viewRef.current.localReady) {
      return;
    }

    patchView({ busy: true, error: "" });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });

      callRef.current.localStream = stream;
      attachLocalVideo(stream);
      patchView({
        audioEnabled: true,
        localReady: true,
        videoEnabled: stream.getVideoTracks().length > 0
      });
      sendSignal({ type: "call-ready" });
      sendMediaState();

      Object.keys(viewRef.current.peers).forEach(async id => {
        if (callRef.current.peerReady[id] && shouldOfferTo(id)) {
          await createAndSendOffer(Number(id));
        }
      });
    } catch (error) {
      showError(
        error?.name === "NotAllowedError"
          ? "Camera or microphone permission was denied."
          : "Unable to start camera or microphone."
      );
    } finally {
      patchView({ busy: false });
    }
  }

  function sendMediaState() {
    sendSignal({
      type: "media-state",
      audioEnabled: viewRef.current.audioEnabled,
      videoEnabled: viewRef.current.videoEnabled,
      screenSharing: viewRef.current.sharingScreen
    });
  }

  function toggleAudio() {
    const nextEnabled = !viewRef.current.audioEnabled;

    callRef.current.localStream?.getAudioTracks().forEach(track => {
      track.enabled = nextEnabled;
    });
    patchView({ audioEnabled: nextEnabled });
    setTimeout(sendMediaState, 0);
  }

  function toggleVideo() {
    const nextEnabled = !viewRef.current.videoEnabled;

    callRef.current.localStream?.getVideoTracks().forEach(track => {
      track.enabled = nextEnabled;
    });
    patchView({ videoEnabled: nextEnabled });
    setTimeout(sendMediaState, 0);
  }

  async function replaceVideoTrack(nextTrack, stream) {
    const peers = Object.values(callRef.current.peerConnections);

    for (const connection of peers) {
      const sender = connection.getSenders().find(candidate => candidate.track?.kind === "video");
      if (sender) {
        await sender.replaceTrack(nextTrack);
      } else if (nextTrack) {
        connection.addTrack(nextTrack, stream);
      }
    }
  }

  async function stopScreenShare() {
    const call = callRef.current;
    const cameraTrack = call.localStream?.getVideoTracks()[0] || null;

    await replaceVideoTrack(cameraTrack, call.localStream);
    call.screenStream?.getTracks().forEach(track => track.stop());
    call.screenStream = null;
    attachLocalVideo(call.localStream);
    patchView({ sharingScreen: false });
    setTimeout(sendMediaState, 0);
  }

  async function toggleScreenShare() {
    if (viewRef.current.sharingScreen) {
      await stopScreenShare();
      return;
    }

    if (!navigator.mediaDevices?.getDisplayMedia || !viewRef.current.localReady) {
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        audio: false,
        video: true
      });
      const screenTrack = screenStream.getVideoTracks()[0];

      callRef.current.screenStream = screenStream;
      screenTrack.onended = () => {
        if (viewRef.current.sharingScreen) {
          stopScreenShare();
        }
      };
      await replaceVideoTrack(screenTrack, screenStream);
      attachLocalVideo(screenStream);
      patchView({ sharingScreen: true, videoEnabled: true });
      setTimeout(sendMediaState, 0);
    } catch (error) {
      showError("Unable to share screen.");
    }
  }

  function endPeer(personId) {
    const call = callRef.current;
    const connection = call.peerConnections[personId];

    connection?.close();
    delete call.peerConnections[personId];
    delete call.pendingCandidates[personId];
    delete call.peerReady[personId];
    delete call.remoteStreams[personId];
    patchView(current => {
      const peers = { ...current.peers };
      delete peers[personId];
      return { peers };
    });
  }

  function hangUp() {
    sendSignal({ type: "hangup" });
    Object.keys(callRef.current.peerConnections).forEach(endPeer);
    callRef.current.localStream?.getTracks().forEach(track => track.stop());
    callRef.current.screenStream?.getTracks().forEach(track => track.stop());
    callRef.current.localStream = null;
    callRef.current.screenStream = null;
    attachLocalVideo(null);
    patchView({
      audioEnabled: true,
      localReady: false,
      sharingScreen: false,
      videoEnabled: true
    });
  }

  function closeRoom() {
    hangUp();
    callRef.current.socket?.close();
    onClose?.();
  }

  useEffect(() => {
    const socket = openVCSocket(conference.id, {
      onClose: event => {
        patchView({ socketReady: false, error: "" });

        if (event?.code && event.code !== 1000) {
          showError("Video conference connection closed.");
        }
      },
      onError: () => showError("Unable to connect video conference."),
      onMessage: handleSignal,
      onOpen: () => patchView({ socketReady: true })
    });

    callRef.current.socket = socket;

    if (!socket) {
      showError("Video conference socket is not available.");
    }

    return () => {
      hangUp();
      socket?.close();
    };
  }, [conference.id]);

  useEffect(() => {
    attachLocalVideo(view.sharingScreen ? callRef.current.screenStream : callRef.current.localStream);
    Object.entries(callRef.current.remoteStreams).forEach(([personId, stream]) => attachRemoteVideo(personId, stream));
  });

  const peers = useMemo(() => Object.values(view.peers), [view.peers]);
  const callActive = view.localReady || Object.keys(callRef.current.peerConnections).length > 0;

  return (
    <div className="vc-room view-fill">
      <div className="table-toolbar">
        <div className="d-flex align-items-center gap-2 min-w-0">
          <i className="bi bi-camera-video-fill text-primary" aria-hidden="true" />
          <h2 className="table-title">{conference.title || "Video Conference"}</h2>
          <span className="text-secondary text-nowrap">{view.socketReady ? "Connected" : "Connecting"}</span>
        </div>
        <button type="button" className="btn btn-secondary" onClick={closeRoom}>
          <i className="bi bi-arrow-left-circle me-2" aria-hidden="true" />
          Conferences
        </button>
      </div>

      <div
        className="vc-stage"
        ref={stageRef}
        style={{ gridTemplateColumns: "minmax(0, 1fr) 7px minmax(220px, " + sidePanelWidth + "%, 520px)" }}
      >
        <div className="vc-local">
          <video ref={localVideoRef} autoPlay muted playsInline />
          {!view.localReady ? <div className="vc-placeholder"><i className="bi bi-person-video3" /></div> : null}
          <span>{view.sharingScreen ? "Screen" : "You"}</span>
        </div>
        <button
          type="button"
          className="vc-splitter"
          title="Resize panels"
          aria-label="Resize video and side panel"
          onPointerDown={startResize}
        />
        {view.chatOpen ? (
          <VCChatPanel conferenceId={conference.id} />
        ) : (
          <div className="vc-remote-grid">
            {peers.length === 0 ? (
              <div className="vc-waiting">Waiting for participants</div>
            ) : peers.map(peer => (
              <div className="vc-remote" key={peer.personId}>
                <video
                  ref={node => {
                    if (node) {
                      remoteVideoRefs.current[peer.personId] = node;
                      attachRemoteVideo(peer.personId, callRef.current.remoteStreams[peer.personId]);
                    }
                  }}
                  autoPlay
                  playsInline
                />
                {!peer.hasStream ? (
                  <div className="vc-placeholder">
                    <PersonThumbnail name={peer.personName} title={peer.personName} />
                    <strong>{peer.personName}</strong>
                  </div>
                ) : null}
                <div className="vc-peer-badges">
                  {peer.audioEnabled === false ? <i className="bi bi-mic-mute" title="Muted" /> : null}
                  {peer.videoEnabled === false ? <i className="bi bi-camera-video-off" title="Camera off" /> : null}
                  {peer.screenSharing ? <i className="bi bi-display" title="Screen sharing" /> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="vc-controls">
        <button type="button" className="btn btn-primary" disabled={!view.socketReady || view.localReady || view.busy} onClick={startCall}>
          <i className="bi bi-telephone-fill me-2" aria-hidden="true" />
          Start
        </button>
        <button type="button" className="btn btn-outline-secondary" disabled={!view.localReady} onClick={toggleAudio}>
          <i className={view.audioEnabled ? "bi bi-mic" : "bi bi-mic-mute"} aria-hidden="true" />
        </button>
        <button type="button" className="btn btn-outline-secondary" disabled={!view.localReady || view.sharingScreen} onClick={toggleVideo}>
          <i className={view.videoEnabled ? "bi bi-camera-video" : "bi bi-camera-video-off"} aria-hidden="true" />
        </button>
        <button type="button" className="btn btn-outline-primary" disabled={!view.localReady} onClick={toggleScreenShare}>
          <i className={(view.sharingScreen ? "bi bi-display-fill" : "bi bi-display") + " me-2"} aria-hidden="true" />
          {view.sharingScreen ? "Stop Share" : "Share"}
        </button>
        <button type="button" className={"btn " + (view.chatOpen ? "btn-primary" : "btn-outline-secondary")} onClick={() => patchView(current => ({ chatOpen: !current.chatOpen }))}>
          <i className="bi bi-chat-dots" aria-hidden="true" />
        </button>
        <button type="button" className="btn btn-outline-danger" disabled={!callActive} onClick={hangUp}>
          <i className="bi bi-telephone-x me-2" aria-hidden="true" />
          End
        </button>
      </div>
    </div>
  );
}
