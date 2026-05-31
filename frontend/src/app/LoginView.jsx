import { useState } from "react";
import { copyrightText, title } from "./AppText.js";
import { useApp } from "../state/AppContext.jsx";
import { AppMessages } from "./AppMessages.jsx";
import { Footer } from "./Footer.jsx";
import { Form } from "../common/form/Form.jsx";
import { Input } from "../common/form/Input.jsx";
import { useRenderDebug } from "../common/useRenderDebug.js";

export function LoginView() {
  useRenderDebug("LoginView");

  const { login, loginBusy, theme } = useApp();
  const [personId, setPersonId] = useState("");
  const [password, setPassword] = useState("");

  async function submit() {
    if (!loginBusy) {
      await login(personId, password);
    }
  }

  return (
    <div className="login-shell" style={theme.cssVars}>
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
            <img className="app-logo login-logo" src={theme.assets.logo} alt={title} />
            <div>
              <h1>{title}</h1>
            </div>
          </div>
          <Input
            label="Person Id"
            editable={!loginBusy}
            id="login-person-id"
            type="number"
            value={personId}
            onChange={setPersonId}
          />
          <Input
            label="Password"
            editable={!loginBusy}
            id="login-password"
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
