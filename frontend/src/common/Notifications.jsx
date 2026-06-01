import { useEffect, useState } from "react";
import { Button } from "../components/Button.jsx";
import { useRenderDebug } from "./useRenderDebug.js";
import { deleteAllNotifications, deleteNotification, getNotifications } from "../services/notificationService.js";

function formatNotificationDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).replace("T", " ");
  }

  return date.toLocaleString();
}

export function Notifications({ notifications: initialNotifications = [], onClose, onLoaded }) {
  useRenderDebug("Notifications");

  const [notifications, setNotifications] = useState(initialNotifications);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);

    try {
      const loaded = await getNotifications();

      setNotifications(loaded);
      onLoaded?.(loaded);
    } catch (error) {
      console.error("Unable to load notifications", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function removeNotification(id) {
    try {
      await deleteNotification(id);

      const nextNotifications = notifications.filter(notification => notification.id !== id);

      setNotifications(nextNotifications);
      onLoaded?.(nextNotifications);
    } catch (error) {
      console.error("Unable to delete notification", error);
    }
  }

  async function removeAll() {
    try {
      await deleteAllNotifications();
      setNotifications([]);
      onLoaded?.([]);
    } catch (error) {
      console.error("Unable to delete notifications", error);
    }
  }

  function close(clickEvent) {
    clickEvent?.preventDefault();
    clickEvent?.stopPropagation();
    onClose?.();
  }

  return (
    <div className="modal-backdrop-custom" onClick={close}>
      <div className="modal-panel notification-panel" onClick={event => event.stopPropagation()}>
        <div className="modal-header px-0 pt-0 d-flex align-items-center justify-content-between gap-3">
          <h2 className="modal-title fs-4">Notifications</h2>
          <div className="d-inline-flex align-items-center gap-2">
            <Button color="secondary-line" size="sm" icon="arrow-clockwise" title="Refresh" onClick={event => {
              event.preventDefault();
              event.stopPropagation();
              load();
            }} />
            <Button color="danger-line" size="sm" disabled={notifications.length === 0} icon="trash3" label="Delete All" onClick={event => {
              event.preventDefault();
              event.stopPropagation();
              removeAll();
            }} />
          </div>
        </div>
        {loading ? (
          <div className="notification-empty">Loading notifications</div>
        ) : notifications.length === 0 ? (
          <div className="notification-empty">No notifications</div>
        ) : (
          <div className="notification-list">
            {notifications.map(notification => (
              <div className="notification-item" key={notification.id}>
                <div className="notification-item-main">
                  <strong>{notification.title}</strong>
                  <p>{notification.message}</p>
                  <span>{formatNotificationDate(notification.createdOn)}</span>
                </div>
                <Button color="danger-line" size="sm" icon="trash3" title="Delete notification" onClick={event => {
                  event.preventDefault();
                  event.stopPropagation();
                  removeNotification(notification.id);
                }} />
              </div>
            ))}
          </div>
        )}
        <div className="d-flex flex-wrap align-items-center justify-content-end gap-2 mt-3">
          <Button color="secondary-line" icon="x-circle" label="Close" onClick={close} />
        </div>
      </div>
    </div>
  );
}
