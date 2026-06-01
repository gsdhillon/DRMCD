import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button.jsx";
import { Notifications } from "../common/Notifications.jsx";
import { getNotifications } from "../services/notificationService.js";
import { openNotificationSocket } from "../services/notificationSocket.js";
import { getUpcomingVideoConferences } from "../services/vcService.js";
import { useApp } from "./AppContext.jsx";

function countLabel(count) {
  return count > 99 ? "99+" : String(count);
}

function formatConferenceTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).replace("T", " ");
  }

  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

export function StatusPanel() {
  const { auth } = useApp();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [conferences, setConferences] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [conferencesOpen, setConferencesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const popupRef = useRef(null);

  useEffect(() => {
    if (!mobileOpen && !conferencesOpen) {
      return undefined;
    }

    function closePopups(pointerEvent) {
      if (popupRef.current?.contains(pointerEvent.target)) {
        return;
      }

      setMobileOpen(false);
      setConferencesOpen(false);
    }

    const eventName = window.PointerEvent ? "pointerdown" : "mousedown";

    document.addEventListener(eventName, closePopups, true);
    return () => document.removeEventListener(eventName, closePopups, true);
  }, [conferencesOpen, mobileOpen]);

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
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

    async function loadConferences() {
      if (!auth) {
        setConferences([]);
        return;
      }

      try {
        const loaded = await getUpcomingVideoConferences();

        if (!cancelled) {
          setConferences(loaded);
        }
      } catch (error) {
        console.error("Unable to load upcoming video conferences", error);
      }
    }

    loadNotifications();
    loadConferences();

    const socket = openNotificationSocket(auth, message => {
      if (message.type === "notification-created") {
        loadNotifications();
      }

      if (message.type === "upcoming-conferences-status") {
        setConferences(message.conferences || []);
      }
    });

    return () => {
      cancelled = true;

      if (socket) {
        socket.close();
      }
    };
  }, [auth]);

  function openNotifications(clickEvent) {
    clickEvent?.preventDefault();
    clickEvent?.stopPropagation();
    setMobileOpen(false);
    setConferencesOpen(false);
    setNotificationsOpen(true);
  }

  function toggleConferences(clickEvent) {
    clickEvent?.preventDefault();
    clickEvent?.stopPropagation();
    setMobileOpen(false);
    setConferencesOpen(open => !open);
  }

  function toggleMobile(clickEvent) {
    clickEvent?.preventDefault();
    clickEvent?.stopPropagation();
    setConferencesOpen(false);
    setMobileOpen(open => !open);
  }

  function openVideoConferences() {
    setConferencesOpen(false);
    setMobileOpen(false);
    navigate("/video-conferences");
  }

  function renderNotificationsButton(label = "Notifications") {
    return (
      <Button color="secondary-line" title={label} ariaLabel={label} onClick={openNotifications}>
        <i className="bi bi-bell" aria-hidden="true" />
        {notifications.length > 0 ? (
          <span className="notification-badge">{countLabel(notifications.length)}</span>
        ) : null}
      </Button>
    );
  }

  function renderConferenceButton(label = "Upcoming conferences") {
    return (
      <Button color="secondary-line" title={label} ariaLabel={label} onClick={toggleConferences}>
        <i className="bi bi-camera-video" aria-hidden="true" />
        {conferences.length > 0 ? (
          <span className="notification-badge status-badge-info">{countLabel(conferences.length)}</span>
        ) : null}
      </Button>
    );
  }

  const totalStatusCount = notifications.length + conferences.length;

  return (
    <div className="status-panel" ref={popupRef}>
      <div className="status-panel-desktop">
        {renderNotificationsButton()}
        {renderConferenceButton()}
      </div>
      <div className="status-panel-mobile">
        <Button color="secondary-line" title="Status" ariaLabel="Status" onClick={toggleMobile}>
          <i className="bi bi-bell-fill" aria-hidden="true" />
          {totalStatusCount > 0 ? (
            <span className="notification-badge">{countLabel(totalStatusCount)}</span>
          ) : null}
        </Button>
      </div>
      {mobileOpen ? (
        <div className="status-popup status-popup-mobile">
          <Button look="profile-menu" onClick={openNotifications}>
            <i className="bi bi-bell" aria-hidden="true" />
            <span>Notifications</span>
            <strong>{notifications.length}</strong>
          </Button>
          <Button look="profile-menu" onClick={toggleConferences}>
            <i className="bi bi-camera-video" aria-hidden="true" />
            <span>Upcoming VCs</span>
            <strong>{conferences.length}</strong>
          </Button>
        </div>
      ) : null}
      {conferencesOpen ? (
        <div className="status-popup upcoming-vc-popup">
          <div className="status-popup-header">
            <strong>Upcoming VCs</strong>
            <Button color="secondary-line" size="sm" icon="box-arrow-up-right" title="Open VCs" onClick={openVideoConferences} />
          </div>
          {conferences.length === 0 ? (
            <div className="status-empty">No upcoming VCs</div>
          ) : (
            <div className="upcoming-vc-list">
              {conferences.map(conference => (
                <Button look="profile-menu" key={conference.id} onClick={openVideoConferences}>
                  <i className={conference.startAllowed ? "bi bi-play-circle-fill" : "bi bi-clock"} aria-hidden="true" />
                  <span>
                    <strong>#{conference.id} {conference.title || "Video Conference"}</strong>
                    <small>{formatConferenceTime(conference.scheduledAt)}</small>
                  </span>
                </Button>
              ))}
            </div>
          )}
        </div>
      ) : null}
      {notificationsOpen ? (
        <Notifications
          notifications={notifications}
          onClose={() => setNotificationsOpen(false)}
          onLoaded={setNotifications}
        />
      ) : null}
    </div>
  );
}
