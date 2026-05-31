import { useState } from "react";
import { BrowserBlocker, noBrowserSaveFormProps } from "../BrowserBlocker.jsx";

export function Form({
  busy = false,
  children,
  className = "",
  closeLabel = "Close",
  editable = true,
  onClose,
  onSubmit,
  side,
  subtitle,
  submitIcon = "bi bi-check2-circle",
  submitLabel = "Save",
  title
}) {
  const [closingAnimation, setClosingAnimation] = useState("");
  const animationClass = closingAnimation ? " modal-closing-" + closingAnimation : "";
  const formClassName = "modal-panel data-form-panel" + (className ? " " + className : "") + animationClass;
  const layoutClassName = "data-form-layout" + (side ? " data-form-layout-with-side" : "");

  function closeWithAnimation(animation) {
    if (busy || closingAnimation) {
      return;
    }
    setClosingAnimation(animation);
    window.setTimeout(() => {
      setClosingAnimation("");
      onClose?.();
    }, animation === "submit" ? 440 : 360);
  }

  async function submit(event) {
    event.preventDefault();

    const result = await onSubmit?.();

    if (result !== false) {
      closeWithAnimation("submit");
    }
  }

  return (
    <div className={"modal-backdrop-custom" + animationClass} onClick={() => closeWithAnimation("throw")}>
      <form
        {...noBrowserSaveFormProps}
        className={formClassName}
        onClick={event => event.stopPropagation()}
        onSubmit={submit}
      >
        <BrowserBlocker />

        <div className="modal-header px-0 pt-0 mb-3">
          <div>
            <h2 className="modal-title fs-4">{title}</h2>
            {subtitle ? <p className="mb-0">{subtitle}</p> : null}
          </div>
        </div>

        <div className={layoutClassName}>
          <div className="data-form-details">
            <div className="data-form-fields">
              {children}
            </div>

            <div className="d-flex flex-wrap align-items-center gap-2 mt-1">
              {editable ? (
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  <i className={submitIcon + " me-2"} aria-hidden="true" />
                  {submitLabel}
                </button>
              ) : null}
              <button type="button" className="btn btn-secondary dialog-close-button" disabled={busy} onClick={() => closeWithAnimation("throw")}>
                <i className="bi bi-x-circle me-2" aria-hidden="true" />
                {closeLabel}
              </button>
            </div>
          </div>

          {side ? (
            <div className="data-form-side">
              {side}
            </div>
          ) : null}
        </div>
      </form>
    </div>
  );
}
