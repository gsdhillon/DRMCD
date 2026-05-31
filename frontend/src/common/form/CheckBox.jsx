import { Button } from "../Button.jsx";
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
          <Button color="secondary-line" size="sm" icon="info-circle" title="Info" onClick={() => showInfo(infoMsg)} />
        ) : null}
      </div>
    </label>
  );
}
