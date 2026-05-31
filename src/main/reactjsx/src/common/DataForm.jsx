import { useEffect, useState } from "react";
import { valueOrEmpty } from "../app/Helpers.js";
import { useRenderDebug } from "../app/useRenderDebug.js";

const DEFAULT_EMPTY_VALUE = {};
const DEFAULT_INITIAL_VALUE = {};

function fieldValue(draft, field) {
  if (typeof field.value === "function") {
    return field.value(draft);
  }

  return valueOrEmpty(draft[field.name]);
}

function unlockAutofillBlockedInput(inputEvent) {
  const input = inputEvent.currentTarget || inputEvent.target;

  if (input) {
    input.readOnly = false;
  }
}

function renderFieldControl(field, draft, editable, change) {
  const disabled = field.disabled || !editable;
  const commonProps = {
    ...(field.inputProps || {}),
    autoComplete: field.autoComplete || "off",
    className: field.className || (field.type === "select" ? "form-select" : "form-control"),
    disabled,
    name: field.inputName || field.name,
    placeholder: field.placeholder || field.label,
    value: fieldValue(draft, field)
  };

  function update(value) {
    if (field.onChange) {
      field.onChange(value, draft, change);
      return;
    }

    change(field.name, value);
  }

  if (field.render) {
    return field.render({ change, disabled, draft, editable, field, value: commonProps.value });
  }

  if (field.type === "select") {
    return (
      <select {...commonProps} onChange={event => update(event.target.value)}>
        {(field.options || []).map(option => {
          const value = field.getOptionValue ? field.getOptionValue(option) : option.value;
          const label = field.getOptionLabel ? field.getOptionLabel(option) : option.label;

          return <option key={String(value ?? label)} value={value ?? ""}>{label}</option>;
        })}
      </select>
    );
  }

  const guardedProps = field.unlockAutofill
    ? {
        onClick: unlockAutofillBlockedInput,
        onFocus: unlockAutofillBlockedInput,
        readOnly: editable
      }
    : {};

  return (
    <input
      {...commonProps}
      {...guardedProps}
      spellCheck={field.spellCheck}
      style={field.style}
      type={field.type === "password" ? "text" : field.type || "text"}
      onChange={event => update(event.target.value)}
    />
  );
}

export function DataForm({
  autoComplete = "off",
  closeIcon = "bi bi-x-circle",
  closeLabel = "Close",
  closeOnBackdrop = true,
  editable = true,
  emptyValue = DEFAULT_EMPTY_VALUE,
  fields = [],
  formClassName = "",
  initialValue = DEFAULT_INITIAL_VALUE,
  mode = "add",
  onClose,
  onSave,
  renderAfterFields,
  sideContent,
  submitIcon,
  submitLabel,
  title
}) {
  useRenderDebug("DataForm");

  const [draft, setDraft] = useState(() => ({ ...emptyValue, ...(initialValue || {}) }));
  const [closingAnimation, setClosingAnimation] = useState("");

  useEffect(() => {
    setDraft({ ...emptyValue, ...(initialValue || {}) });
  }, [emptyValue, initialValue]);

  function change(field, value) {
    setDraft(current => ({ ...current, [field]: value }));
  }

  function closeWithAnimation(animation) {
    if (closingAnimation) {
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

    const result = await onSave?.(draft);

    if (result !== false) {
      closeWithAnimation("submit");
    }
  }

  const animationClass = closingAnimation ? " modal-closing-" + closingAnimation : "";
  const visibleFields = fields.filter(field => !(field.hidden || (!editable && field.hiddenWhenView)));
  const afterFields = typeof renderAfterFields === "function" ? renderAfterFields({ change, draft, editable, mode }) : renderAfterFields;
  const side = typeof sideContent === "function" ? sideContent({ change, draft, editable, mode }) : sideContent;
  const resolvedSubmitIcon = submitIcon || (mode === "update" ? "bi bi-check2-circle" : "bi bi-plus-lg");
  const resolvedSubmitLabel = submitLabel || (mode === "update" ? "Update" : "Add");

  return (
    <div className={"modal-backdrop-custom" + animationClass} onClick={closeOnBackdrop ? () => closeWithAnimation("throw") : undefined}>
      <form
        className={"modal-panel data-form-panel" + animationClass + (formClassName ? " " + formClassName : "")}
        autoComplete={autoComplete}
        data-1p-ignore="true"
        data-bwignore="true"
        data-form-type="other"
        data-lpignore="true"
        onClick={event => event.stopPropagation()}
        onSubmit={submit}
      >
        <input autoComplete="username" aria-hidden="true" name="username" readOnly className="hidden-autofill-field" tabIndex={-1} type="text" />
        <input autoComplete="current-password" aria-hidden="true" name="password" readOnly className="hidden-autofill-field" tabIndex={-1} type="password" />

        {title ? (
          <div className="modal-header px-0 pt-0">
            <h2 className="modal-title fs-4">{title}</h2>
          </div>
        ) : null}

        <div className={"data-form-layout" + (side ? " data-form-layout-with-side" : "")}>
          <div className="data-form-details">
            <div className="data-form-fields">
              {visibleFields.map(field => (
                <label key={field.name} className="form-row">
                  <span>{field.label}</span>
                  {renderFieldControl(field, draft, editable, change)}
                </label>
              ))}
            </div>

            {afterFields}

            <div className="d-flex flex-wrap align-items-center gap-2 mt-1">
              {editable ? (
                <button type="submit" className="btn btn-primary">
                  <i className={resolvedSubmitIcon + " me-2"} aria-hidden="true" />
                  {resolvedSubmitLabel}
                </button>
              ) : null}
              <button type="button" className="btn btn-secondary dialog-close-button" onClick={() => closeWithAnimation("throw")}>
                <i className={closeIcon + " me-2"} aria-hidden="true" />
                {closeLabel}
              </button>
            </div>
          </div>

          {side ? <div className="data-form-side">{side}</div> : null}
        </div>
      </form>
    </div>
  );
}
