import { BrowserBlocker, noBrowserSaveFormProps } from "../BrowserBlocker.jsx";
import { Button } from "../Button.jsx";

export function Form({
  animationClass = "",
  busy = false,
  children,
  className = "",
  closeLabel = "Close",
  dialog = false,
  editable = true,
  onClose,
  onSubmit,
  onSubmitSuccess,
  side,
  subtitle,
  submitClassName = "btn btn-primary",
  submitIcon = "bi bi-check2-circle",
  submitLabel = "Save",
  title
}) {
  const baseClassName = dialog ? "modal-panel data-form-panel" : "";
  const formClassName = baseClassName + (className ? " " + className : "") + animationClass;
  const layoutClassName = "data-form-layout" + (side ? " data-form-layout-with-side" : "");

  async function submit(event) {
    event.preventDefault();

    const result = await onSubmit?.();

    if (result !== false) {
      onSubmitSuccess?.();
    }
  }

  return (
    <form
      {...noBrowserSaveFormProps}
      className={formClassName.trim()}
      onClick={event => event.stopPropagation()}
      onSubmit={submit}
    >
      <BrowserBlocker />

      {title || subtitle ? (
        <div className="modal-header px-0 pt-0 mb-3">
          <div>
            {title ? <h2 className="modal-title fs-4">{title}</h2> : null}
            {subtitle ? <p className="mb-0">{subtitle}</p> : null}
          </div>
        </div>
      ) : null}

      <div className={layoutClassName}>
        <div className="data-form-details">
          <div className="data-form-fields">
            {children}
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2 mt-1">
            {editable ? (
              <Button className={submitClassName} disabled={busy} icon={submitIcon} label={submitLabel} type="submit" />
            ) : null}
            {onClose ? (
              <Button className="btn btn-secondary dialog-close-button" disabled={busy} icon="bi bi-x-circle" label={closeLabel} onClick={onClose} />
            ) : null}
          </div>
        </div>

        {side ? (
          <div className="data-form-side">
            {side}
          </div>
        ) : null}
      </div>
    </form>
  );
}
