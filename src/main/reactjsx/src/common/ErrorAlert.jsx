import { useEffect, useRef } from "react";
import { useRenderDebug } from "../app/useRenderDebug.js";
import { useApp } from "../state/AppContext.jsx";

export function ErrorAlert({ error, onClear }) {
  useRenderDebug("ErrorAlert");

  const { showError } = useApp();
  const previousErrorRef = useRef("");

  useEffect(() => {
    if (error && error !== previousErrorRef.current) {
      showError(error);
      onClear?.();
    }

    previousErrorRef.current = error || "";
  }, [error, onClear, showError]);

  return <div className="editor-error-slot" />;
}
