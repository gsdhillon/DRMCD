import { useApp } from "../../state/AppContext.jsx";

export function CheckBox({
  editable = true,
  infoMsg,
  label,
  onChange,
  options = ["ON", "OFF"],
  value
}) {
  const { showInfo } = useApp();
  const checked = value === true;

  return (
    <label className="form-row">
      <span>{label}</span>
      <div className="app-settings-inline-control">
        <input
          className="form-check-input"
          checked={checked}
          disabled={!editable}
          type="checkbox"
          onChange={event => onChange?.(event.target.checked)}
        />
        <strong className={checked ? "text-success" : "text-secondary"}>{checked ? options[0] : options[1]}</strong>
        {infoMsg ? (
          <button type="button" className="btn btn-sm btn-link app-settings-info-button" title="Info" onClick={() => showInfo(infoMsg)}>
            <i className="bi bi-info-circle" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </label>
  );
}
