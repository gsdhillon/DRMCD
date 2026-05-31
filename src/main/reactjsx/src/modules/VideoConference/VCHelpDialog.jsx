import { useState } from "react";
import { Button } from "../../common/Button.jsx";
import { useRenderDebug } from "../../common/useRenderDebug.js";
import { getVideoConferenceHelp } from "../../services/vcService.js";
import { useApp } from "../../state/AppContext.jsx";

export function useVCHelpDialog() {
  const { showError } = useApp();
  const [helpDialog, setHelpDialog] = useState(null);
  const [helpError, setHelpError] = useState("");
  const [helpLoading, setHelpLoading] = useState(false);

  async function openHelp() {
    setHelpError("");
    setHelpLoading(true);
    setHelpDialog({
      title: "Video Conference Rules",
      rules: []
    });

    try {
      setHelpDialog(await getVideoConferenceHelp());
    } catch (error) {
      showError(error.message || "Unable to load VC help");
    } finally {
      setHelpLoading(false);
    }
  }

  function closeHelp() {
    setHelpDialog(null);
    setHelpError("");
  }

  return {
    closeHelp,
    helpDialog,
    helpError,
    helpLoading,
    openHelp
  };
}

export function VCHelpDialog({ help, error, loading, onClose }) {
  useRenderDebug("VCHelpDialog");

  if (!help) {
    return null;
  }

  return (
    <div className="modal-backdrop-custom" onClick={onClose}>
      <div className="modal-panel vc-help-panel" onClick={event => event.stopPropagation()}>
        <div className="modal-header px-0 pt-0">
          <h2 className="modal-title fs-4">
            <i className="bi bi-question-circle me-2" aria-hidden="true" />
            {help.title || "Video Conference Rules"}
          </h2>
        </div>

        {loading ? <div className="notification-empty">Loading help...</div> : null}

        {!loading && !error ? (
          <ol className="vc-help-rules">
            {(help.rules || []).map((rule, index) => (
              <li key={index}>{rule}</li>
            ))}
          </ol>
        ) : null}

        <div className="d-flex justify-content-end mt-3">
          <Button className="btn btn-secondary dialog-close-button" icon="bi bi-x-circle" label="Close" onClick={onClose} />
        </div>
      </div>
    </div>
  );
}
