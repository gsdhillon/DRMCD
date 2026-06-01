import { useEffect, useMemo, useState } from "react";
import { useRenderDebug } from "../../common/useRenderDebug.js";
import { Button } from "../../components/Button.jsx";
import { DataTable } from "../../common/DataTable.jsx";
import { createRole, deleteRole, getRoles, updateRole } from "../../services/roleService.js";
import { useApp } from "../../app/AppContext.jsx";
import { RoleDialog } from "./RoleDialog.jsx";

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
  const [roleDialog, setRoleDialog] = useState(null);
  const [columnFilters, setColumnFilters] = useState({});

  const isSuperAdmin = auth?.role === "SuperAdmin";
  const columns = [
    { field: "id", label: "Id" },
    { field: "name", label: "Role" },
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

  function openAddRole() {
    setRoleDialog({ role: null });
  }

  function editRole(role) {
    setRoleDialog({ role });
  }

  async function saveRole(role) {
    try {
      if (role.id) {
        await updateRole(role);
      } else {
        await createRole(role);
      }
      await loadRoles();
      return true;
    } catch (saveError) {
      showError(saveError.message || "Unable to save role");
      return false;
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
        <Button color="secondary-line" size="sm" me={1} icon="pencil-square" title="Edit" onClick={() => editRole(role)} />
        <Button color="danger-line" size="sm" icon="trash" title="Delete" onClick={() => removeRole(role)} />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <div className="content-panel" />;
  }

  return (
    <div className="view-fill roles-view">
      <DataTable
        addIcon="bi bi-palette"
        addLabel="Add Role"
        centerPanelToolbar
        columnFilters={columnFilters}
        columns={columns}
        currentPage={1}
        emptyText="No roles found"
        exportRows={visibleRoles}
        filteredCount={visibleRoles.length}
        icon="bi bi-palette"
        onAdd={openAddRole}
        onClearColumnFilters={clearColumnFilters}
        onColumnFilter={updateColumnFilter}
        renderActions={renderActions}
        rows={visibleRoles}
        searchFields={["name"]}
        searchInputId="role-search"
        showTitle={false}
        title="Edit Roles"
        totalCount={roles.length}
        totalPages={1}
      />
      {roleDialog ? (
        <RoleDialog
          role={roleDialog.role}
          onClose={() => setRoleDialog(null)}
          onSave={saveRole}
        />
      ) : null}
    </div>
  );
}
