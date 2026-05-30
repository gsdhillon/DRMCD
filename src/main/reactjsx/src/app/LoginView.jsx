import { useState } from "react";
import { copyrightText, title } from "./AppText.js";
import { useApp } from "../state/AppContext.jsx";
import { Footer } from "./Footer.jsx";
import { useRenderDebug } from "./useRenderDebug.js";

export function LoginView() {
  useRenderDebug("LoginView");

  const { login, loginBusy, loginError, theme } = useApp();
  const [personId, setPersonId] = useState("");
  const [password, setPassword] = useState("");

  async function submit(event) {
    event.preventDefault();

    if (!loginBusy) {
      await login(personId, password);
    }
  }

  return (
    <div className="login-shell" style={theme.cssVars}>
      <main className="login-content">
        <form className="login-panel" onSubmit={submit}>
          <div className="login-brand">
            <img className="app-logo login-logo" src={theme.assets.logo} alt={title} />
            <div>
              <h1>{title}</h1>
            </div>
          </div>
          <label className="form-row">
            <span>Person Id</span>
            <input
              id="login-person-id"
              type="number"
              className="form-control"
              autoComplete="username"
              name="username"
              value={personId}
              onChange={event => setPersonId(event.target.value)}
            />
          </label>
          <label className="form-row">
            <span>Password</span>
            <input
              id="login-password"
              type="password"
              className="form-control"
              autoComplete="current-password"
              name="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
            />
          </label>
          {loginError ? <div className="alert alert-danger">{loginError}</div> : null}
          <button type="submit" className="btn btn-primary w-100" disabled={loginBusy}>
            <i className="bi bi-box-arrow-in-right" aria-hidden="true" />
            {loginBusy ? "Signing in" : "Login"}
          </button>
        </form>
      </main>
      <Footer footerText={copyrightText} />
    </div>
  );
}
