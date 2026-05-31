import { noAutofillInputProps } from "../BrowserBlocker.jsx";
import { valueOrEmpty } from "../Helpers.js";

export function Input({
  label,
  className = "form-control",
  editable = true,
  onChange,
  placeholder = label,
  suffix,
  value,
  ...props
}) {
  const inputProps = {
    ...props,
    className,
    disabled: !editable,
    placeholder,
    value: valueOrEmpty(value),
    onChange: event => onChange?.(event.target.value)
  };

  const input = <input {...noAutofillInputProps(inputProps, editable)} />;
  const control = suffix ? (
    <div className="input-group">
      {input}
      <span className="input-group-text">{suffix}</span>
    </div>
  ) : input;

  if (!label) {
    return control;
  }

  return (
    <label className="form-row">
      <span>{label}</span>
      {control}
    </label>
  );
}
