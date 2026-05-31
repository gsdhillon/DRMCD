import { responseErrorMessage, restUrl } from "./endpoint.js";

const AUTH_KEY = "drmcd.auth";

function authUrl(path) {
  return restUrl("/auth" + path);
}

function isExpired(auth) {
  return !auth?.expiresAt || Math.floor(Date.now() / 1000) >= auth.expiresAt;
}

export function getAuth() {
  try {
    const auth = JSON.parse(localStorage.getItem(AUTH_KEY) || "null");

    if (!auth || isExpired(auth)) {
      logout();
      return null;
    }

    return auth;
  } catch (error) {
    logout();
    return null;
  }
}

export function saveAuth(auth) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export function logout() {
  localStorage.removeItem(AUTH_KEY);
}

export function authHeaders() {
  const auth = getAuth();

  return auth?.token
    ? { Authorization: "Bearer " + auth.token }
    : {};
}

export async function login(personId, password) {
  const response = await fetch(authUrl("/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      personId: Number(personId),
      password
    })
  });

  if (!response.ok) {
    throw new Error(await responseErrorMessage(response, "Invalid login"));
  }

  const auth = await response.json();

  saveAuth(auth);
  return auth;
}

export async function changePassword(currentPassword, newPassword) {
  const response = await fetch(authUrl("/change-password"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders()
    },
    body: JSON.stringify({
      currentPassword,
      newPassword
    })
  });

  if (!response.ok) {
    throw new Error(await responseErrorMessage(response, "Unable to change password"));
  }

  return response.json();
}
