import { useEffect } from "react";
import { useApp } from "../app/AppContext.jsx";

export function useRenderDebug(componentName) {
  const { settings } = useApp();

  useEffect(() => {
    // Ishjyot [30/05/2026] : For performance check of use context
    if (settings?.clientInDevMode === true) {
      console.log("[render]", componentName);
    }
  });
}
