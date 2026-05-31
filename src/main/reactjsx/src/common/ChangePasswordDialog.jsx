import { useState } from "react";
import { useRenderDebug } from "../app/useRenderDebug.js";
import { changePassword } from "../services/auth.js";
import { useApp } from "../state/AppContext.jsx";

export function ChangePasswordDialog({ onClose }) {
  useRenderDebug("ChangePasswordDialog");

  const { showError, showInfo } = useApp();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitPassword(formEvent) {
    formEvent.preventDefault();

    if (!currentPassword || !newPassword) {
      showError("Current password and new password are required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      showError("New password and confirm password must match.");
      return;
    }

    setBusy(true);

    try {
      const response = await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showInfo(response.message || "Password changed");
    } catch (changeError) {
      showError(changeError.message || "Unable to change password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop-custom" onClick={busy ? undefined : onClose}>
      <form className="modal-panel password-panel" onSubmit={submitPassword} onClick={event => event.stopPropagation()}>
        <div className="modal-header px-0 pt-0 d-flex align-items-center justify-content-between gap-3">
          <div>
            <h2>Change Password</h2>
            <p>Update your login password.</p>
          </div>
          <button type="button" className="btn btn-secondary" title="Close" onClick={onClose} disabled={busy}>
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-3">
          <label className="form-row">
            <span>Current Password</span>
            <input
              className="form-control"
              type="password"
              value={currentPassword}
              onChange={event => setCurrentPassword(event.target.value)}
              autoFocus
              disabled={busy}
            />
          </label>
          <label className="form-row">
            <span>New Password</span>
            <input
              className="form-control"
              type="password"
              value={newPassword}
              onChange={event => setNewPassword(event.target.value)}
              disabled={busy}
            />
          </label>
          <label className="form-row">
            <span>Confirm Password</span>
            <input
              className="form-control"
              type="password"
              value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)}
              disabled={busy}
            />
          </label>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2 mt-1">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Changing..." : "Change Password"}
          </button>
        </div>
      </form>
    </div>
  );
}
