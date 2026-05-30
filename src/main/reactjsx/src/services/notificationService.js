import { api } from "./api.js";

export function getNotifications() {
  return api("/notifications");
}

export function deleteNotification(id) {
  return api("/notifications/" + encodeURIComponent(id), {
    method: "DELETE"
  });
}

export function deleteAllNotifications() {
  return api("/notifications", {
    method: "DELETE"
  });
}
