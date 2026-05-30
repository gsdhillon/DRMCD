import { useEffect, useRef, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { Dashboard } from "../modules/Dashboard/Dashboard.jsx";
import { GroupList } from "../modules/Group/GroupList.jsx";
import { PersonList } from "../modules/Person/PersonList.jsx";
import { RoleList } from "../modules/Role/RoleList.jsx";
import { VCList } from "../modules/VideoConference/VCList.jsx";
import { AppMessages } from "./AppMessages.jsx";
import { Footer } from "./Footer.jsx";
import { Header } from "./Header.jsx";
import { SideMenu } from "./SideMenu.jsx";
import { useRenderDebug } from "./useRenderDebug.js";
import { useApp } from "../state/AppContext.jsx";

export function AppShell() {
  useRenderDebug("AppShell");

  const { theme } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuCollapsed, setMenuCollapsed] = useState(false);
  const [mainPanelFullscreen, setMainPanelFullscreen] = useState(false);
  const mainPanelRef = useRef(null);

  useEffect(() => {
    function updateFullscreenState() {
      setMainPanelFullscreen(document.fullscreenElement === mainPanelRef.current);
    }

    document.addEventListener("fullscreenchange", updateFullscreenState);
    return () => document.removeEventListener("fullscreenchange", updateFullscreenState);
  }, []);

  async function toggleMainPanelFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await mainPanelRef.current?.requestFullscreen();
  }

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
        {menuOpen ? <button type="button" className="app-menu-backdrop" onClick={() => setMenuOpen(false)} /> : null}
        <main className="main-panel">
          <div id="main-panel" ref={mainPanelRef}>
            <button
              type="button"
              className="main-panel-fullscreen-button"
              title={mainPanelFullscreen ? "Exit full screen" : "Full screen"}
              aria-label={mainPanelFullscreen ? "Exit full screen" : "Full screen"}
              onClick={toggleMainPanelFullscreen}
            >
              <i className={mainPanelFullscreen ? "bi bi-fullscreen-exit" : "bi bi-fullscreen"} aria-hidden="true" />
            </button>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/persons" element={<PersonList />} />
              <Route path="/groups" element={<GroupList />} />
              <Route path="/roles" element={<RoleList />} />
              <Route path="/video-conferences" element={<VCList />} />
            </Routes>
          </div>
        </main>
        <aside className="app-right-side" aria-hidden="true" />
      </div>
      <Footer />
    </div>
  );
}
