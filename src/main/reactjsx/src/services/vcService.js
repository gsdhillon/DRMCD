import { api } from "./api.js";

export function getVideoConferences() {
  return api("/video-conferences");
}

export function getVideoConferenceHelp() {
  return api("/video-conferences/help");
}

export function createVideoConference(conference) {
  return api("/video-conferences", {
    method: "POST",
    body: JSON.stringify(conference)
  });
}

export function updateVideoConference(conference) {
  return api("/video-conferences", {
    method: "PUT",
    body: JSON.stringify(conference)
  });
}

export function deleteVideoConference(conferenceId) {
  return api("/video-conferences/" + encodeURIComponent(conferenceId), {
    method: "DELETE"
  });
}
