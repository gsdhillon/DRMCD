import { api } from "./api.js";

function fromApi(role) {
  const { role: roleName, ...rest } = role;

  return {
    ...rest,
    name: role.name ?? roleName ?? ""
  };
}

function toApi(role) {
  return {
    ...role,
    role: role.name ?? role.role ?? ""
  };
}

export function getRoles() {
  return api("/roles").then(roles => roles.map(fromApi));
}

export function createRole(role) {
  return api("/roles", {
    method: "POST",
    body: JSON.stringify(toApi(role))
  });
}

export function updateRole(role) {
  return api("/roles", {
    method: "PUT",
    body: JSON.stringify(toApi(role))
  });
}

export function deleteRole(id) {
  return api("/roles/" + encodeURIComponent(id), {
    method: "DELETE"
  });
}
