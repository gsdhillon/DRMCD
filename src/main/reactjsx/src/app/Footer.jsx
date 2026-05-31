import { copyrightText } from "./AppText.js";
import { useApp } from "../state/AppContext.jsx";
import { useRenderDebug } from "./useRenderDebug.js";

function formatAppVersion(appVersion) {
  const version = String(appVersion || "")
    .trim()
    .replace(/^(app\s*)?(version|build)\s*:\s*/i, "");

  return version
    ? "Build: " + version
    : "";
}

export function Footer({ footerText = copyrightText }) {
  useRenderDebug("Footer");

  const { setThemeMode, settings, theme, themeMode } = useApp();
  const darkMode = themeMode === "dark";
  const appVersion = formatAppVersion(settings?.appVersion);
  const clientDevMode = settings?.clientInDevMode === true;
  const clientDevModeLabel = clientDevMode ? "Dev mode ON. See console." : undefined;

  return (
    <footer className="app-footer">
      <div className="app-footer-left">
        <button
          type="button"
          className={"footer-theme-toggle" + (darkMode ? " footer-theme-toggle-dark" : "")}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          aria-pressed={darkMode}
          title={darkMode ? "Light" : "Dark"}
          onClick={() => setThemeMode(darkMode ? "light" : "dark")}
        >
          <span className="footer-theme-toggle-track">
            <span className="footer-theme-toggle-knob" />
          </span>
          <span className="footer-theme-toggle-text">{darkMode ? "Dark" : "Light"}</span>
        </button>
      </div>
      <span>{footerText}</span>
      <div className="app-footer-right">
        {appVersion ? <span className="app-version-footer">{appVersion}</span> : null}
        <span
          className={"app-framework-status" + (clientDevMode ? " app-framework-status-on" : "")}
          aria-label={clientDevModeLabel}
          title={clientDevModeLabel}
        >
          <img className="app-framework-logo" src={theme.assets.footerImage} alt="React JSX" />
          {clientDevMode ? <span className="app-framework-status-badge">ON</span> : null}
        </span>
      </div>
    </footer>
  );
}
