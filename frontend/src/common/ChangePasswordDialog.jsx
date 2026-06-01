import { useState } from "react";
import { Form } from "../components/Form.jsx";
import { FormDialog } from "../components/FormDialog.jsx";
import { Input } from "../components/Input.jsx";
import { useRenderDebug } from "./useRenderDebug.js";
import { changePassword } from "../services/auth.js";
import { useApp } from "../app/AppContext.jsx";

export function ChangePasswordDialog({ onClose }) {
  useRenderDebug("ChangePasswordDialog");

  const { showError, showInfo } = useApp();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitPassword() {
    if (!currentPassword || !newPassword) {
      showError("Current password and new password are required.");
      return false;
    }

    if (newPassword !== confirmPassword) {
      showError("New password and confirm password must match.");
      return false;
    }

    setBusy(true);

    try {
      const response = await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showInfo(response.message || "Password changed");
      return true;
    } catch (changeError) {
      showError(changeError.message || "Unable to change password.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormDialog busy={busy} onClose={onClose}>
      <Form
        busy={busy}
        className="password-panel"
        closeLabel="Cancel"
        onSubmit={submitPassword}
        subtitle="Update your login password."
        submitLabel={busy ? "Changing..." : "Change Password"}
        title="Change Password"
      >
        <Input
          label="Current Password"
          autoFocus
          editable={!busy}
          type="password"
          value={currentPassword}
          onChange={setCurrentPassword}
        />
        <Input
          label="New Password"
          editable={!busy}
          type="password"
          value={newPassword}
          onChange={setNewPassword}
        />
        <Input
          label="Confirm Password"
          editable={!busy}
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
        />
      </Form>
    </FormDialog>
  );
}
