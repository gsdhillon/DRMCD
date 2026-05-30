import { photoSrc } from "../app/Helpers.js";
import { useRenderDebug } from "../app/useRenderDebug.js";

function roleBorderColor(user) {
  const color = String(user?.roleColor || "").replace(/^#/, "");

  if (/^[0-9a-f]{6}$/i.test(color)) {
    return "#" + color;
  }

  const role = String(user?.role || "").toLowerCase();

  if (role === "superadmin") {
    return "#FF0000";
  }

  if (role === "admin") {
    return "#0000FF";
  }

  return "#00FF00";
}

export function Avatar({ user, onClick }) {
  useRenderDebug("Avatar");

  return (
    <button
      type="button"
      className="avatar header-avatar avatar-clickable"
      style={{ borderColor: roleBorderColor(user) }}
      title="Account"
      onClick={onClick}
    >
      {user?.photo
        ? <img className="avatar-image" src={photoSrc(user.photo)} alt={user.name || "User"} />
        : <span className="avatar-empty"><i className="bi bi-person" aria-hidden="true" /></span>}
    </button>
  );
}
