import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "../common/Avatar.jsx";
import { ChangePasswordDialog } from "../common/ChangePasswordDialog.jsx";
import { Notifications } from "../common/Notifications.jsx";
import { subTitle, title } from "./AppText.js";
import { getNotifications } from "../services/notificationService.js";
import { AppSettingsDialog } from "../modules/Settings/AppSettingsDialog.jsx";
import { openNotificationSocket } from "../services/notificationSocket.js";
import { useApp } from "../state/AppContext.jsx";
import { useRenderDebug } from "./useRenderDebug.js";

export function Header({ menuOpen, onMenuToggle }) {
  useRenderDebug("Header");

  const { auth, logout, theme, user } = useApp();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
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

  useEffect(() => {
    let cancelled = false;

    async function loadInitialNotifications() {
      if (!auth) {
        setNotifications([]);
        return;
      }

      try {
        const loaded = await getNotifications();

        if (!cancelled) {
          setNotifications(loaded);
        }
      } catch (error) {
        console.error("Unable to load notifications", error);
      }
    }

    loadInitialNotifications();

    const socket = openNotificationSocket(auth, message => {
      if (message.type === "notification-created") {
        loadInitialNotifications();
      }
    });

    return () => {
      cancelled = true;

      if (socket) {
        socket.close();
      }
    };
  }, [auth]);

  function notificationCountLabel(count) {
    return count > 99 ? "99+" : String(count);
  }

  function toggleNotifications(clickEvent) {
    clickEvent?.preventDefault();
    clickEvent?.stopPropagation();
    setProfileMenuOpen(false);
    setNotificationsOpen(open => !open);
  }

  function openChangePassword() {
    setProfileMenuOpen(false);
    setNotificationsOpen(false);
    setPasswordDialogOpen(true);
  }

  function openRoles() {
    setProfileMenuOpen(false);
    setNotificationsOpen(false);
    navigate("/roles");
  }

  function openSettings() {
    setProfileMenuOpen(false);
    setNotificationsOpen(false);
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
      <div className="notification-bar">
        <button type="button" className="header-icon-button" title="Notifications" onClick={toggleNotifications}>
          <i className="bi bi-bell" aria-hidden="true" />
          {notifications.length > 0 ? (
            <span className="notification-badge">{notificationCountLabel(notifications.length)}</span>
          ) : null}
        </button>
      </div>
      <div className="header-user">
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
              <button type="button" className="profile-menu-item" onClick={openChangePassword}>
                <i className="bi bi-key" aria-hidden="true" />
                <span>Change Password</span>
              </button>
              {user?.role === "SuperAdmin" ? (
                <>
                  <button type="button" className="profile-menu-item" onClick={openSettings}>
                    <i className="bi bi-gear" aria-hidden="true" />
                    <span>App Settings</span>
                  </button>
                  <button type="button" className="profile-menu-item" onClick={openRoles}>
                    <i className="bi bi-palette" aria-hidden="true" />
                    <span>Edit Roles</span>
                  </button>
                </>
              ) : null}
              <button type="button" className="profile-menu-item profile-menu-danger" onClick={logout}>
                <i className="bi bi-box-arrow-right" aria-hidden="true" />
                <span>Logout</span>
              </button>
            </div>
          ) : null}
        </div>
        <button type="button" className="header-menu-button" title={menuOpen ? "Close menu" : "Menu"} onClick={onMenuToggle}>
          <i className="bi bi-list" aria-hidden="true" />
        </button>
      </div>
      {notificationsOpen ? (
        <Notifications
          notifications={notifications}
          onClose={() => setNotificationsOpen(false)}
          onLoaded={setNotifications}
        />
      ) : null}
      {passwordDialogOpen ? <ChangePasswordDialog onClose={() => setPasswordDialogOpen(false)} /> : null}
      {settingsDialogOpen ? <AppSettingsDialog onClose={() => setSettingsDialogOpen(false)} /> : null}
    </header>
  );
}
