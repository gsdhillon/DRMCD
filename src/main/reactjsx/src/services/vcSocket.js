import { getAuth } from "./auth.js";
import { socketUrl } from "./endpoint.js";

export function openVCSocket(conferenceId, { onClose, onError, onMessage, onOpen } = {}) {
  const auth = getAuth();

  if (!auth?.token || !conferenceId || !window.WebSocket) {
    return null;
  }

  const socket = new WebSocket(
    socketUrl(
      "/persons/video/socket?conferenceId=" +
        encodeURIComponent(conferenceId) +
        "&token=" +
        encodeURIComponent(auth.token)
    )
  );

  socket.onopen = event => onOpen?.(event);
  socket.onclose = event => onClose?.(event);
  socket.onerror = event => {
    console.error("Video chat socket error", event);
    onError?.(event);
  };
  socket.onmessage = message => {
    try {
      onMessage?.(JSON.parse(message.data));
    } catch (error) {
      console.error("Invalid video chat socket message", error);
    }
  };

  return socket;
}
