import { AppShell } from "./AppShell.jsx";
import { LoginView } from "./LoginView.jsx";
import { useRenderDebug } from "./useRenderDebug.js";
import { useApp } from "../state/AppContext.jsx";

export function App() {
  useRenderDebug("App");

  const { auth } = useApp();

  return auth ? <AppShell /> : <LoginView />;
}
