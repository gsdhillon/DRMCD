import { useState } from "react";
import { appAssets, copyrightText, title } from "./AppConfig.js";
import { useApp } from "./AppContext.jsx";
import { AppMessages } from "./AppMessages.jsx";
import { Footer } from "./Footer.jsx";
import { Form } from "../components/Form.jsx";
import { Input } from "../components/Input.jsx";
import { useRenderDebug } from "../common/useRenderDebug.js";

export function LoginView() {
  useRenderDebug("LoginView");

  const { login, loginBusy } = useApp();
  const [personId, setPersonId] = useState("");
  const [password, setPassword] = useState("");

  async function submit() {
    if (!loginBusy) {
      await login(personId, password);
    }
  }

  return (
    <div className="login-shell">
      <AppMessages />
      <main className="login-content">
        <Form
          busy={loginBusy}
          className="login-panel"
          onSubmit={submit}
          submitIcon="box-arrow-in-right"
          submitLabel={loginBusy ? "Signing in" : "Login"}
          submitFull
        >
          <div className="login-brand">
            <img className="app-logo login-logo" src={appAssets.appLogo} alt={title} />
            <div>
              <h1>{title}</h1>
            </div>
          </div>
          <Input
            label="Person Id"
            editable={!loginBusy}
            id="login-person-id"
            placeholder=""
            type="number"
            value={personId}
            onChange={setPersonId}
          />
          <Input
            label="Password"
            editable={!loginBusy}
            id="login-password"
            placeholder=""
            type="password"
            value={password}
            onChange={setPassword}
          />
        </Form>
      </main>
      <Footer footerText={copyrightText} />
    </div>
  );
}
