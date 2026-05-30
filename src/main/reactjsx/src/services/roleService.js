import { api } from "./api.js";

export function getRoles() {
  return api("/roles");
}

export function createRole(role) {
  return api("/roles", {
    method: "POST",
    body: JSON.stringify(role)
  });
}

export function updateRole(role) {
  return api("/roles", {
    method: "PUT",
    body: JSON.stringify(role)
  });
}

export function deleteRole(id) {
  return api("/roles/" + encodeURIComponent(id), {
    method: "DELETE"
  });
}
