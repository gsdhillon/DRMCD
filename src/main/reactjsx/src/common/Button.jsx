const buttonLooks = {
  primary: "btn btn-primary",
  "primary-full": "btn btn-primary w-100",
  secondary: "btn btn-secondary",
  danger: "btn btn-danger",
  "outline-primary": "btn btn-outline-primary",
  "outline-secondary": "btn btn-outline-secondary",
  "outline-danger": "btn btn-outline-danger",
  "small-primary": "btn btn-sm btn-outline-primary",
  "small-secondary": "btn btn-sm btn-outline-secondary",
  "small-secondary-spaced": "btn btn-sm btn-outline-secondary me-1",
  "small-danger": "btn btn-sm btn-outline-danger",
  "notification-delete": "btn btn-sm btn-outline-danger notification-delete",
  "dialog-close": "btn btn-secondary dialog-close-button",
  "table-add": "btn btn-primary table-add-button",
  "table-nav": "btn btn-outline-secondary table-add-button table-nav-button",
  "table-help": "btn btn-outline-secondary table-add-button table-help-button",
  "table-tool": "btn btn-outline-secondary table-tool-button",
  "table-clear-filters": "btn btn-outline-secondary table-tool-button table-clear-filters",
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

export function Button({
  active = false,
  ariaLabel,
  children,
  className,
  icon,
  label,
  look = "secondary",
  title,
  type = "button",
  ...props
}) {
  const content = children ?? label;
  const hasContent = content !== undefined && content !== null && content !== "";
  const iconClassName = icon && hasContent ? icon + " me-2" : icon;
  const baseClassName = className || buttonLooks[look] || buttonLooks.secondary;
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
      {icon ? <i className={iconClassName} aria-hidden="true" /> : null}
      {content}
    </button>
  );
}
