import { valueOrEmpty } from "../common/Helpers.js";

function optionColor(color) {
  const normalizedColor = String(color || "").replace(/^#/, "");
  return /^[0-9a-f]{6}$/i.test(normalizedColor) ? "#" + normalizedColor : "";
}

function readableTextColor(backgroundColor) {
  const color = optionColor(backgroundColor);

  if (!color) {
    return undefined;
  }

  const red = parseInt(color.slice(1, 3), 16);
  const green = parseInt(color.slice(3, 5), 16);
  const blue = parseInt(color.slice(5, 7), 16);
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;

  return brightness > 150 ? "#000000" : "#FFFFFF";
}

function optionStyle(option) {
  if (!option) {
    return undefined;
  }

  const backgroundColor = optionColor(option.color);

  return backgroundColor
    ? { backgroundColor, color: readableTextColor(backgroundColor), cursor: "pointer" }
    : { cursor: "pointer" };
}

export function Select({
  children,
  className = "form-select",
  editable = true,
  label,
  onChange,
  options,
  style,
  value,
  ...props
}) {
  const selectedValue = String(valueOrEmpty(value));
  const selectedOption = options?.find(option => String(option.id) === selectedValue) || null;
  const visibleValue = options && !selectedOption
    ? ""
    : selectedValue;

  function selectOption(event) {
    const selectedValue = event.target.value;
    const option = options?.find(candidate => String(candidate.id) === selectedValue) || null;

    onChange?.(selectedValue, option);
  }

  const select = (
    <select
      {...props}
      className={className}
      disabled={!editable}
      style={{ cursor: "pointer", ...style, ...optionStyle(selectedOption) }}
      value={visibleValue}
      onChange={selectOption}
    >
      {options ? (
        options.map(option => (
          <option key={option.id} value={option.id} style={optionStyle(option)}>{option.name}</option>
        ))
      ) : children}
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
