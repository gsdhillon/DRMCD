const buttonLooks = {
  "dialog-close": "btn btn-secondary dialog-close-button",
  "table-column-filter": "btn btn-link table-column-filter-toggle",
  "table-search-clear": "btn btn-outline-secondary table-search-clear",
  "column-sort": "btn btn-link p-0 fw-semibold text-decoration-none text-dark",
  "settings-info": "btn btn-sm btn-link app-settings-info-button",
  "header-icon": "header-icon-button",
  "header-menu": "header-menu-button",
  "profile-menu": "profile-menu-item",
  "profile-menu-danger": "profile-menu-item profile-menu-danger",
  "message-close": "app-message-close",
  "menu-backdrop": "app-menu-backdrop",
  "menu-collapse": "app-menu-collapse-button",
  "fullscreen": "main-panel-fullscreen-button",
  "page-link": "page-link",
  avatar: "avatar header-avatar avatar-clickable",
  "vc-splitter": "vc-splitter"
};

const buttonColors = {
  "primary-fill": "btn-primary",
  "primary-line": "btn-outline-primary",
  "secondary-fill": "btn-secondary",
  "secondary-line": "btn-outline-secondary",
  "danger-fill": "btn-danger",
  "danger-line": "btn-outline-danger"
};

function normalButtonClassName(color, size, me, full) {
  return [
    "btn",
    size === "sm" ? "btn-sm" : "",
    buttonColors[color] || buttonColors["secondary-fill"],
    Number(me) > 0 ? "me-" + Number(me) : "",
    full ? "w-100" : ""
  ].filter(Boolean).join(" ");
}

function bootstrapIconClassName(icon, iconClassName, hasContent) {
  if (!icon) {
    return "";
  }

  const baseClassName = icon.startsWith("bi ")
    ? icon
    : "bi bi-" + icon;

  return [
    baseClassName,
    iconClassName,
    hasContent ? "me-2" : ""
  ].filter(Boolean).join(" ");
}

export function Button({
  active = false,
  ariaLabel,
  children,
  className,
  color = "secondary-fill",
  full = false,
  icon,
  iconClassName,
  label,
  look,
  me = 0,
  size = "md",
  title,
  type = "button",
  ...props
}) {
  const content = children ?? label;
  const hasContent = content !== undefined && content !== null && content !== "";
  const finalIconClassName = bootstrapIconClassName(icon, iconClassName, hasContent);
  const baseClassName = className || buttonLooks[look] || normalButtonClassName(color, size, me, full);
  const buttonClassName = baseClassName + (active ? " active" : "");

  return (
    <button
      type={type}
      className={buttonClassName}
      title={title}
      aria-pressed={active || undefined}
      aria-label={ariaLabel || title}
      {...props}
    >
      {icon ? <i className={finalIconClassName} aria-hidden="true" /> : null}
      {content}
    </button>
  );
}
