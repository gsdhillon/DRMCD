import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getAuth, login as loginRequest, logout as logoutRequest } from "../services/auth.js";
import { getPerson } from "../services/personService.js";
import { getSettings } from "../services/settingsService.js";
import { socketUrl } from "../services/endpoint.js";
import { resolveReactTheme } from "../theme/reactTheme.js";

const AppContext = createContext(null);

function initialThemeMode() {
  const params = new URLSearchParams(window.location.search);
  const requestedTheme = params.get("theme");

  if (requestedTheme === "dark" || requestedTheme === "light") {
    return requestedTheme;
  }

  return localStorage.getItem("DRMCDThemeMode") === "dark"
    ? "dark"
    : "light";
}

export function AppProvider({ children }) {
  const [auth, setAuth] = useState(() => getAuth());
  const [currentPerson, setCurrentPerson] = useState(null);
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [messages, setMessages] = useState([]);
  const [settings, setSettings] = useState({});
  const [themeMode, setThemeModeState] = useState(initialThemeMode);

  const theme = useMemo(() => resolveReactTheme(themeMode), [themeMode]);

  const setThemeMode = useCallback(mode => {
    const nextMode = mode === "dark" ? "dark" : "light";

    localStorage.setItem("DRMCDThemeMode", nextMode);
    setThemeModeState(nextMode);
  }, []);

  const hideMessage = useCallback(id => {
    setMessages(current => current.filter(message => message.id !== id));
  }, []);

  const showMessage = useCallback((type, text) => {
    const message = String(text || "").trim();

    if (!message) {
      return null;
    }

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);

    setMessages(current => current.concat({
      id,
      text: message,
      type
    }));
    return id;
  }, []);

  const showError = useCallback(message => showMessage("error", message), [showMessage]);
  const showInfo = useCallback(message => showMessage("info", message), [showMessage]);
  const showAlert = useCallback(message => showMessage("alert", message), [showMessage]);

  const login = useCallback(async (personId, password) => {
    setLoginBusy(true);
    setLoginError("");

    try {
      const nextAuth = await loginRequest(personId, password);

      setAuth(nextAuth);
      return nextAuth;
    } catch (error) {
      const message = error.message || "Invalid login";

      setLoginError(message);
      showError(message);
      return null;
    } finally {
      setLoginBusy(false);
    }
  }, []);

  const logout = useCallback(() => {
    logoutRequest();
    setAuth(null);
    setCurrentPerson(null);
  }, []);

  useEffect(() => {
    const onInvalidAuth = () => setAuth(null);

    window.addEventListener("drmcd-auth-invalid", onInvalidAuth);
    return () => window.removeEventListener("drmcd-auth-invalid", onInvalidAuth);
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const nextSettings = await getSettings();

      setSettings(nextSettings || {});
      return nextSettings || {};
    } catch (error) {
      console.error("Unable to load app settings", error);
      setSettings({});
      return {};
    }
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  useEffect(() => {
    if (!auth?.token) {
      return undefined;
    }

    const socket = new WebSocket(socketUrl("/settings/socket?token=" + encodeURIComponent(auth.token)));

    socket.onmessage = event => {
      let data = null;

      try {
        data = JSON.parse(event.data);
      } catch (error) {
        console.error("Invalid settings socket message", error);
      }

      if (data?.type === "settings-changed") {
        refreshSettings();
      }
    };
    socket.onerror = error => console.error("Settings socket error", error);

    return () => socket.close();
  }, [auth?.token, refreshSettings]);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentPerson() {
      if (!auth?.personId) {
        setCurrentPerson(null);
        return;
      }

      try {
        const person = await getPerson(auth.personId);

        if (!cancelled) {
          setCurrentPerson(person);
        }
      } catch (error) {
        console.error("Unable to load logged in person details", error);

        if (!cancelled) {
          setCurrentPerson(null);
        }
      }
    }

    loadCurrentPerson();

    return () => {
      cancelled = true;
    };
  }, [auth?.personId]);

  useEffect(() => {
    document.body.classList.toggle("theme-dark", themeMode === "dark");
    document.body.classList.toggle("theme-light", themeMode !== "dark");
  }, [themeMode]);

  const user = useMemo(() => ({
    ...(auth || {}),
    ...(currentPerson || {}),
    personId: auth?.personId || currentPerson?.id,
    photo: currentPerson?.photo || currentPerson?.thumbnail || auth?.photo,
    role: auth?.role || currentPerson?.role,
    roleColor: currentPerson?.roleColor || auth?.roleColor
  }), [auth, currentPerson]);

  const value = useMemo(() => ({
    auth,
    currentPerson,
    hideMessage,
    login,
    loginBusy,
    loginError,
    logout,
    messages,
    refreshSettings,
    setThemeMode,
    showAlert,
    showError,
    showInfo,
    settings,
    theme,
    themeMode,
    user
  }), [auth, currentPerson, hideMessage, login, loginBusy, loginError, logout, messages, refreshSettings, setThemeMode, showAlert, showError, showInfo, settings, theme, themeMode, user]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useApp must be used inside AppProvider");
  }

  return context;
}
