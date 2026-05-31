export function Button({
  ariaLabel,
  children,
  className = "btn btn-secondary",
  icon,
  label,
  title,
  type = "button",
  ...props
}) {
  const content = children ?? label;
  const hasContent = content !== undefined && content !== null && content !== "";
  const iconClassName = icon && hasContent ? icon + " me-2" : icon;

  return (
    <button
      type={type}
      className={className}
      title={title}
      aria-label={ariaLabel || title}
      {...props}
    >
      {icon ? <i className={iconClassName} aria-hidden="true" /> : null}
      {content}
    </button>
  );
}
