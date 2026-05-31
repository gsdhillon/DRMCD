import { useEffect } from "react";
import { Button } from "../common/Button.jsx";
import { useApp } from "../state/AppContext.jsx";

function messageIcon(type) {
  if (type === "error") {
    return "bi bi-exclamation-triangle-fill";
  }

  if (type === "alert") {
    return "bi bi-bell-fill";
  }

  return "bi bi-info-circle-fill";
}

function messageTitle(type) {
  if (type === "error") {
    return "Error";
  }

  if (type === "alert") {
    return "Alert";
  }

  return "Info";
}

function AppMessage({ message, timeoutMs, onHide }) {
  useEffect(() => {
    const timer = window.setTimeout(onHide, timeoutMs);

    return () => window.clearTimeout(timer);
  }, [message.id, onHide, timeoutMs]);

  return (
    <div className={"app-message app-message-" + message.type} role={message.type === "error" ? "alert" : "status"}>
      <i className={messageIcon(message.type)} aria-hidden="true" />
      <div className="app-message-body">
        <strong>{messageTitle(message.type)}</strong>
        <span>{message.text}</span>
      </div>
      <Button look="message-close" icon="bi bi-x-lg" title="Hide" ariaLabel="Hide message" onClick={onHide} />
    </div>
  );
}

export function AppMessages() {
  const { hideMessage, messages, settings } = useApp();
  const popupSeconds = Number(settings?.popupMsgTime || 3);
  const timeoutMs = Math.max(1, Number.isFinite(popupSeconds) ? popupSeconds : 3) * 1000;

  if (!messages.length) {
    return null;
  }

  return (
    <div className="app-messages" aria-live="polite">
      {messages.map(message => (
        <AppMessage
          key={message.id}
          message={message}
          timeoutMs={timeoutMs}
          onHide={() => hideMessage(message.id)}
        />
      ))}
    </div>
  );
}
