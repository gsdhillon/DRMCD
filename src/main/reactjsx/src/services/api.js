import { authHeaders, logout } from "./auth.js";
import { responseErrorMessage, restUrl } from "./endpoint.js";

export async function api(path, options = {}) {
  const response = await fetch(restUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {})
    }
  });

  if (response.status === 401) {
    logout();
    window.dispatchEvent(new CustomEvent("drmcd-auth-invalid"));
  }

  if (!response.ok) {
    throw new Error(await responseErrorMessage(response, "HTTP " + response.status));
  }

  return response.status === 204
    ? null
    : response.json();
}

