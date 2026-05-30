import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { App } from "./app/App.jsx";
import { AppProvider } from "./state/AppContext.jsx";
import "./css/bootstrap/bootstrap.min.css";
import "./css/bootstrap-icons/bootstrap-icons.min.css";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </HashRouter>
  </React.StrictMode>
);
