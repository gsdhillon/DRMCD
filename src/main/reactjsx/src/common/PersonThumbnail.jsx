import { photoSrc } from "./Helpers.js";
import { useRenderDebug } from "./useRenderDebug.js";

function roleBorderColor(role, roleColor) {
  const color = String(roleColor || "").replace(/^#/, "");

  if (/^[0-9a-f]{6}$/i.test(color)) {
    return "#" + color;
  }

  const normalizedRole = String(role || "").toLowerCase();

  if (normalizedRole === "superadmin") {
    return "#FF0000";
  }

  if (normalizedRole === "admin") {
    return "#0000FF";
  }

  return "#00FF00";
}

export function PersonThumbnail({ alt, className = "", name, onClick, photo, role, roleColor, title }) {
  useRenderDebug("PersonThumbnail");

  const normalizedRole = String(role || "").toLowerCase();
  const roleClass =
    normalizedRole === "superadmin"
      ? " person-thumbnail-role-superadmin"
      : normalizedRole === "admin"
        ? " person-thumbnail-role-admin"
        : " person-thumbnail-role-user";
  const thumbnailClass =
    "person-thumbnail" +
    (onClick ? " person-thumbnail-clickable" : "") +
    roleClass +
    (className ? " " + className : "");

  return (
    <button
      type="button"
      className={thumbnailClass}
      style={{ borderColor: roleBorderColor(role, roleColor) }}
      title={title || name || "View"}
      onClick={onClick}
    >
      {photo
        ? <img className="person-thumbnail-image" src={photoSrc(photo)} alt={alt || name || "Person"} />
        : <span className="person-thumbnail-empty"><i className="bi bi-person" aria-hidden="true" /></span>}
    </button>
  );
}
