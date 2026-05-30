import { api } from "./api.js";

export function getGroups() {
  return api("/groups");
}

export function getGroup(id) {
  return api("/groups/" + encodeURIComponent(id));
}

export function getGroupPersons(id) {
  return api("/groups/" + encodeURIComponent(id) + "/persons");
}

export function createGroup(group) {
  return api("/groups", {
    method: "POST",
    body: JSON.stringify(group)
  });
}

export function updateGroup(group) {
  return api("/groups", {
    method: "PUT",
    body: JSON.stringify(group)
  });
}

export function deleteGroup(id) {
  return api("/groups/" + encodeURIComponent(id), {
    method: "DELETE"
  });
}
