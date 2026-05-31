import { useState } from "react";
import { Route, Routes } from "react-router-dom";
import { Dashboard } from "../modules/Dashboard/Dashboard.jsx";
import { Button } from "../common/Button.jsx";
import { CenterPanel } from "../common/CenterPanel.jsx";
import { GroupList } from "../modules/Group/GroupList.jsx";
import { PersonList } from "../modules/Person/PersonList.jsx";
import { RoleList } from "../modules/Role/RoleList.jsx";
import { VCList } from "../modules/VideoConference/VCList.jsx";
import { AppMessages } from "./AppMessages.jsx";
import { Footer } from "./Footer.jsx";
import { Header } from "./Header.jsx";
import { SideMenu } from "./SideMenu.jsx";
import { useRenderDebug } from "../common/useRenderDebug.js";
import { useApp } from "../state/AppContext.jsx";

export function AppShell() {
  useRenderDebug("AppShell");

  const { theme } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuCollapsed, setMenuCollapsed] = useState(false);

  return (
    <div className="app-shell" style={theme.cssVars}>
      <AppMessages />
      <Header menuOpen={menuOpen} onMenuToggle={() => setMenuOpen(open => !open)} />
      <div className={"app-body" + (menuCollapsed ? " app-menu-collapsed" : "")}>
        <SideMenu
          collapsed={menuCollapsed}
          open={menuOpen}
          onCollapseToggle={() => {
            setMenuCollapsed(collapsed => !collapsed);
            setMenuOpen(false);
          }}
        />
        {menuOpen ? <Button look="menu-backdrop" title="Close menu" onClick={() => setMenuOpen(false)} /> : null}
        <main className="main-panel">
          <Routes>
            <Route path="/" element={<CenterPanel title="Dashboard"><Dashboard /></CenterPanel>} />
            <Route path="/persons" element={<CenterPanel title="Persons"><PersonList /></CenterPanel>} />
            <Route path="/groups" element={<CenterPanel title="Groups"><GroupList /></CenterPanel>} />
            <Route path="/roles" element={<CenterPanel title="Roles"><RoleList /></CenterPanel>} />
            <Route path="/video-conferences" element={<CenterPanel title="Video Conferences"><VCList /></CenterPanel>} />
          </Routes>
        </main>
        <aside className="app-right-side" aria-hidden="true" />
      </div>
      <Footer />
    </div>
  );
}
