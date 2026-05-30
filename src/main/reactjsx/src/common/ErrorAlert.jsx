import { useRenderDebug } from "../app/useRenderDebug.js";

export function ErrorAlert({ error, onClear }) {
  useRenderDebug("ErrorAlert");

  return (
    <div className="editor-error-slot">
      {error ? (
        <div className="alert alert-danger alert-dismissible d-flex align-items-center justify-content-between gap-2 m-0">
          <span>{error}</span>
          {onClear ? (
            <button type="button" className="btn btn-sm btn-outline-secondary alert-icon-button" title="Hide" onClick={onClear}>
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
