import { noAutofillInputProps } from "./BrowserBlocker.jsx";
import { valueOrEmpty } from "./Helpers.js";

export function FormInput({
  label,
  className = "form-control",
  editable = true,
  onChange,
  placeholder = label,
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

  if (!label) {
    return input;
  }

  return (
    <label className="form-row">
      <span>{label}</span>
      {input}
    </label>
  );
}
