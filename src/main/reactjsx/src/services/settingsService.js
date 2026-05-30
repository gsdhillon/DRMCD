import { api } from "./api.js";

export function getSettings() {
  return api("/settings");
}

export function updateSettings(settings) {
  return api("/settings", {
    method: "PUT",
    body: JSON.stringify(settings)
  });
}
