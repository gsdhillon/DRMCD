import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { AppShell } from "./app/AppShell.jsx";
import { LoginView } from "./app/LoginView.jsx";
import { AppProvider, useApp } from "./app/AppContext.jsx";
import "./styles/bootstrap.min.css";
import "./styles/bootstrap-icons.min.css";
import "./styles/styles.css";

function RootView() {
  const { auth } = useApp();
  return auth ? <AppShell /> : <LoginView />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <AppProvider>
        <RootView />
      </AppProvider>
    </HashRouter>
  </React.StrictMode>
);
