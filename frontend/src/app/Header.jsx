import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "../common/Avatar.jsx";
import { Button } from "../common/Button.jsx";
import { ChangePasswordDialog } from "../common/ChangePasswordDialog.jsx";
import { subTitle, title } from "./AppText.js";
import { AppSettingsDialog } from "../modules/Settings/AppSettingsDialog.jsx";
import { StatusPanel } from "./StatusPanel.jsx";
import { useApp } from "../state/AppContext.jsx";
import { useRenderDebug } from "../common/useRenderDebug.js";

export function Header({ menuOpen, onMenuToggle }) {
  useRenderDebug("Header");

  const { logout, theme, user } = useApp();
  const navigate = useNavigate();
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    if (!profileMenuOpen) {
      return undefined;
    }

    function closeProfileMenu(pointerEvent) {
      if (profileMenuRef.current?.contains(pointerEvent.target)) {
        return;
      }

      setProfileMenuOpen(false);
    }

    const eventName = window.PointerEvent ? "pointerdown" : "mousedown";

    document.addEventListener(eventName, closeProfileMenu, true);
    return () => document.removeEventListener(eventName, closeProfileMenu, true);
  }, [profileMenuOpen]);

  function openChangePassword() {
    setProfileMenuOpen(false);
    setPasswordDialogOpen(true);
  }

  function openRoles() {
    setProfileMenuOpen(false);
    navigate("/roles");
  }

  function openSettings() {
    setProfileMenuOpen(false);
    setSettingsDialogOpen(true);
  }

  return (
    <header className="app-header">
      <div className="app-brand">
        <img className="app-logo" src={theme.assets.appLogo} alt={title} />
        <div>
          <h1>{title}</h1>
          <p>{subTitle}</p>
        </div>
      </div>
      <div className="header-user">
        <StatusPanel />
        <div className="header-user-text">
          <strong>{user?.name || "User"}</strong>
          <span>{user?.role || ""}</span>
        </div>
        <div className="header-avatar-menu" ref={profileMenuRef}>
          <Avatar user={user} onClick={() => setProfileMenuOpen(open => !open)} />
          {profileMenuOpen ? (
            <div className="profile-menu">
              <div className="profile-menu-user">
                <strong>{user?.name || "User"}</strong>
                <span>{user?.role || ""}</span>
              </div>
              <Button look="profile-menu" onClick={openChangePassword}>
                <i className="bi bi-key" aria-hidden="true" />
                <span>Change Password</span>
              </Button>
              {user?.role === "SuperAdmin" ? (
                <>
                  <Button look="profile-menu" onClick={openSettings}>
                    <i className="bi bi-gear" aria-hidden="true" />
                    <span>App Settings</span>
                  </Button>
                  <Button look="profile-menu" onClick={openRoles}>
                    <i className="bi bi-palette" aria-hidden="true" />
                    <span>Edit Roles</span>
                  </Button>
                </>
              ) : null}
              <Button look="profile-menu-danger" onClick={logout}>
                <i className="bi bi-box-arrow-right" aria-hidden="true" />
                <span>Logout</span>
              </Button>
            </div>
          ) : null}
        </div>
        <Button look="header-menu" icon="list" title={menuOpen ? "Close menu" : "Menu"} onClick={onMenuToggle} />
      </div>
      {passwordDialogOpen ? <ChangePasswordDialog onClose={() => setPasswordDialogOpen(false)} /> : null}
      {settingsDialogOpen ? <AppSettingsDialog onClose={() => setSettingsDialogOpen(false)} /> : null}
    </header>
  );
}
