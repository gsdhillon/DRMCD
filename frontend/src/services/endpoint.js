const DEFAULT_CONTEXT_PATH = "/drmcd";

export function appContextPath() {
  const path = window.location.pathname || "";
  const reactIndex = path.indexOf("/reactjsx");

  if (reactIndex > 0) {
    return path.slice(0, reactIndex);
  }

  if (path.startsWith(DEFAULT_CONTEXT_PATH + "/") || path === DEFAULT_CONTEXT_PATH) {
    return DEFAULT_CONTEXT_PATH;
  }

  return DEFAULT_CONTEXT_PATH;
}

export function restUrl(path) {
  return appContextPath() + "/rest" + path;
}

export function appUrl(path = "") {
  return appContextPath() + path;
}

export function socketUrl(path) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

  return protocol + "//" + window.location.host + appContextPath() + path;
}

export async function responseErrorMessage(response, fallback = "Request failed") {
  try {
    const text = await response.text();
    const trimmed = text.trim();

    if (!trimmed) {
      return fallback;
    }

    if ((response.headers.get("Content-Type") || "").includes("application/json")) {
      const body = JSON.parse(trimmed);
      const message = messageFromJson(body);

      return message || fallback;
    }

    if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
      return messageFromHtml(trimmed) || "Server returned HTTP " + response.status;
    }

    return trimmed;
  } catch (error) {
    console.error("Unable to read error response", error);
    return fallback;
  }
}

function messageFromJson(body) {
  if (!body) {
    return "";
  }

  if (typeof body === "string") {
    return body;
  }

  if (Array.isArray(body)) {
    return body
      .map(messageFromJson)
      .filter(Boolean)
      .join("; ");
  }

  if (Array.isArray(body.messages) && body.messages.length) {
    return body.messages.map(messageFromJson).filter(Boolean).join("; ");
  }

  if (Array.isArray(body.errors) && body.errors.length) {
    return body.errors.map(messageFromJson).filter(Boolean).join("; ");
  }

  return body.message || body.error || body.detail || body.title || "";
}

function messageFromHtml(html) {
  const match =
    html.match(/<body[^>]*>([\s\S]*?)<\/body>/i) ||
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  if (!match) {
    return "";
  }

  return match[1]
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
