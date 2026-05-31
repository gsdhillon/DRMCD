import { socketUrl } from "./endpoint.js";

export function openNotificationSocket(auth, onMessage) {
  if (!auth?.token || !window.WebSocket) {
    return null;
  }

  const socket = new WebSocket(socketUrl("/notifications/socket?token=" + encodeURIComponent(auth.token)));

  socket.onmessage = message => {
    let data = null;

    try {
      data = JSON.parse(message.data);
    } catch (error) {
      console.error("Invalid notification socket message", error);
    }

    if (data && onMessage) {
      onMessage(data);
    }
  };

  socket.onerror = error => {
    console.error("Notification socket error", error);
  };

  return socket;
}
