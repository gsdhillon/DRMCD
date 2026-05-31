import { useEffect, useMemo, useState } from "react";
import { useRenderDebug } from "../../common/useRenderDebug.js";
import { DataTable } from "../../common/DataTable.jsx";
import { createRole, deleteRole, getRoles, updateRole } from "../../services/roleService.js";
import { useApp } from "../../state/AppContext.jsx";

const emptyRole = {
  role: "",
  color: "F4F4F4"
};

function normalizeColor(color) {
  return String(color || "").replace(/^#/, "").toUpperCase();
}

function searchableValue(value) {
  return value === undefined || value === null ? "" : String(value).toLowerCase();
}

function matchesColumnFilters(item, columnFilters) {
  return Object.entries(columnFilters).every(([field, term]) => {
    const normalizedTerm = String(term || "").trim().toLowerCase();
    return !normalizedTerm || searchableValue(item[field]).includes(normalizedTerm);
  });
}

export function RoleList() {
  useRenderDebug("RoleList");

  const { auth, showError } = useApp();
  const [roles, setRoles] = useState([]);
  const [draft, setDraft] = useState(emptyRole);
  const [editingId, setEditingId] = useState(null);
  const [columnFilters, setColumnFilters] = useState({});

  const isSuperAdmin = auth?.role === "SuperAdmin";
  const columns = [
    { field: "id", label: "Id" },
    { field: "role", label: "Role" },
    { field: "color", label: "HEX Color" }
  ];

  async function loadRoles() {
    try {
      setRoles(await getRoles());
    } catch (loadError) {
      showError(loadError.message || "Unable to load roles");
      setRoles([]);
    }
  }

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) {
      showError("SuperAdmin access required.");
    }
  }, [isSuperAdmin, showError]);

  const visibleRoles = useMemo(() => {
    return roles
      .filter(role => matchesColumnFilters(role, columnFilters));
  }, [columnFilters, roles]);

  function updateColumnFilter(field, value) {
    setColumnFilters(current => {
      const next = { ...current };

      if (value.trim()) {
        next[field] = value;
      } else {
        delete next[field];
      }

      return next;
    });
  }

  function clearColumnFilters() {
    setColumnFilters({});
  }

  function editRole(role) {
    setEditingId(role.id);
    setDraft({
      role: role.role || "",
      color: normalizeColor(role.color)
    });
  }

  function resetForm() {
    setEditingId(null);
    setDraft(emptyRole);
  }

  async function saveRole(event) {
    event.preventDefault();

    const payload = {
      id: editingId,
      role: draft.role.trim(),
      color: normalizeColor(draft.color)
    };

    try {
      if (editingId) {
        await updateRole(payload);
      } else {
        await createRole(payload);
      }
      resetForm();
      await loadRoles();
    } catch (saveError) {
      showError(saveError.message || "Unable to save role");
    }
  }

  async function removeRole(role) {
    try {
      await deleteRole(role.id);
      await loadRoles();
    } catch (deleteError) {
      showError(deleteError.message || "Unable to delete role");
    }
  }

  function renderActions(role) {
    return (
      <div className="d-inline-flex align-items-center gap-2">
        <button type="button" className="btn btn-sm btn-outline-secondary me-1" title="Edit" onClick={() => editRole(role)}>
          <i className="bi bi-pencil-square" aria-hidden="true" />
        </button>
        <button type="button" className="btn btn-sm btn-outline-danger" title="Delete" onClick={() => removeRole(role)}>
          <i className="bi bi-trash" aria-hidden="true" />
        </button>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <div className="content-panel" />;
  }

  return (
    <div className="view-fill roles-view">
      <form className="role-editor" onSubmit={saveRole}>
        <label className="form-row">
          <span>Role</span>
          <input className="form-control" value={draft.role} onChange={event => setDraft(current => ({ ...current, role: event.target.value }))} />
        </label>
        <label className="form-row">
          <span>HEX Color</span>
          <input className="form-control" value={draft.color} onChange={event => setDraft(current => ({ ...current, color: normalizeColor(event.target.value) }))} />
        </label>
        <div className="d-flex flex-wrap align-items-center gap-2 mt-0">
          <button type="submit" className="btn btn-primary">
            <i className={(editingId ? "bi bi-check2-circle" : "bi bi-plus-lg") + " me-2"} aria-hidden="true" />
            {editingId ? "Update Role" : "Add Role"}
          </button>
          {editingId ? <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button> : null}
        </div>
      </form>
      <DataTable
        columnFilters={columnFilters}
        columns={columns}
        currentPage={1}
        emptyText="No roles found"
        exportRows={visibleRoles}
        filteredCount={visibleRoles.length}
        icon="bi bi-palette"
        onClearColumnFilters={clearColumnFilters}
        onColumnFilter={updateColumnFilter}
        renderActions={renderActions}
        rows={visibleRoles}
        searchFields={["role"]}
        searchInputId="role-search"
        title="Edit Roles"
        totalCount={roles.length}
        totalPages={1}
      />
    </div>
  );
}
