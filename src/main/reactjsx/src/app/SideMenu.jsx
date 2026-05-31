import { NavLink } from "react-router-dom";
import { useRenderDebug } from "../common/useRenderDebug.js";

export function SideMenu({ collapsed, onCollapseToggle, open }) {
  useRenderDebug("SideMenu");

  return (
    <aside className={"app-menu" + (open ? " app-menu-open" : "")}>
      <button
        type="button"
        className="app-menu-collapse-button"
        title={collapsed ? "Expand menu" : "Collapse menu"}
        aria-label={collapsed ? "Expand menu" : "Collapse menu"}
        onClick={onCollapseToggle}
      >
        <i className={collapsed ? "bi bi-chevron-right" : "bi bi-chevron-left"} aria-hidden="true" />
      </button>
      <NavLink className={({ isActive }) => "app-menu-item" + (isActive ? " active" : "")} to="/">
        <i className="bi bi-speedometer2" aria-hidden="true" />
        <span>Dashboard</span>
      </NavLink>
      <NavLink className={({ isActive }) => "app-menu-item" + (isActive ? " active" : "")} to="/persons">
        <i className="bi bi-people-fill" aria-hidden="true" />
        <span>Persons</span>
      </NavLink>
      <NavLink className={({ isActive }) => "app-menu-item" + (isActive ? " active" : "")} to="/groups">
        <i className="bi bi-collection" aria-hidden="true" />
        <span>Groups</span>
      </NavLink>
      <NavLink className={({ isActive }) => "app-menu-item" + (isActive ? " active" : "")} to="/video-conferences">
        <i className="bi bi-camera-video-fill" aria-hidden="true" />
        <span>Video Conferences</span>
      </NavLink>
    </aside>
  );
}
