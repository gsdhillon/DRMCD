import { valueOrEmpty } from "./Helpers.js";

export function FormSelect({
  children,
  className = "form-select",
  editable = true,
  label,
  onChange,
  value,
  ...props
}) {
  const select = (
    <select
      {...props}
      className={className}
      disabled={!editable}
      value={valueOrEmpty(value)}
      onChange={event => onChange?.(event.target.value)}
    >
      {children}
    </select>
  );

  if (!label) {
    return select;
  }

  return (
    <label className="form-row">
      <span>{label}</span>
      {select}
    </label>
  );
}
