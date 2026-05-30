import { useEffect, useMemo, useState } from "react";
import { useRenderDebug } from "../../app/useRenderDebug.js";
import { DataTable } from "../../common/DataTable.jsx";
import { getPersons } from "../../services/personService.js";
import { createGroup, deleteGroup, getGroup, getGroups, updateGroup } from "../../services/groupService.js";
import { useApp } from "../../state/AppContext.jsx";
import { PersonList } from "../Person/PersonList.jsx";
import { createEmptyGroup, GroupEditorPage } from "./GroupEditorPage.jsx";

const pageSize = 10;

function searchableValue(value) {
  return value === undefined || value === null ? "" : String(value).toLowerCase();
}

function formatDateTime(value) {
  return value ? String(value).replace("T", " ") : "";
}

function compareGroups(sortField, sortDirection) {
  return (first, second) => {
    const firstValue = first[sortField];
    const secondValue = second[sortField];
    const result = sortField === "id"
      ? Number(firstValue || 0) - Number(secondValue || 0)
      : searchableValue(firstValue).localeCompare(searchableValue(secondValue));

    return sortDirection === "asc" ? result : -result;
  };
}

function matchesColumnFilters(item, columnFilters) {
  return Object.entries(columnFilters).every(([field, term]) => {
    const normalizedTerm = String(term || "").trim().toLowerCase();
    return !normalizedTerm || searchableValue(item[field]).includes(normalizedTerm);
  });
}

export function GroupList() {
  useRenderDebug("GroupList");

  const { auth } = useApp();
  const [groups, setGroups] = useState([]);
  const [persons, setPersons] = useState([]);
  const [editor, setEditor] = useState(null);
  const [personGroup, setPersonGroup] = useState(null);
  const [formError, setFormError] = useState("");
  const [listError, setListError] = useState("");
  const [columnFilters, setColumnFilters] = useState({});
  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);

  const isAdmin = auth?.role === "Admin" || auth?.role === "SuperAdmin";

  async function loadGroups() {
    try {
      setListError("");
      setGroups(await getGroups());
    } catch (error) {
      setListError(error.message || "Unable to load groups");
      setGroups([]);
    }
  }

  async function loadPersons() {
    try {
      setPersons(await getPersons());
    } catch (error) {
      setPersons([]);
    }
  }

  useEffect(() => {
    loadGroups();
    loadPersons();
  }, []);

  const visibleGroups = useMemo(() => {
    return groups
      .filter(group => matchesColumnFilters(group, columnFilters))
      .sort(compareGroups(sortField, sortDirection));
  }, [columnFilters, groups, sortDirection, sortField]);

  const totalPages = Math.max(1, Math.ceil(visibleGroups.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageGroups = visibleGroups.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  function openNewGroup() {
    setFormError("");
    setEditor({
      mode: "add",
      group: createEmptyGroup()
    });
  }

  async function openUpdateGroup(group) {
    setFormError("");

    try {
      setEditor({
        mode: "update",
        group: await getGroup(group.id)
      });
    } catch (error) {
      setEditor({
        mode: "update",
        group
      });
    }
  }

  async function viewGroup(group) {
    try {
      setEditor({
        mode: "view",
        group: await getGroup(group.id)
      });
    } catch (error) {
      setEditor({
        mode: "view",
        group
      });
    }
  }

  async function saveGroup(group) {
    try {
      setFormError("");
      if (editor?.mode === "update") {
        await updateGroup(group);
      } else {
        await createGroup(group);
      }

      await loadGroups();
      return true;
    } catch (error) {
      setFormError(error.message || "Unable to save group");
      return false;
    }
  }

  function closeEditor() {
    setEditor(null);
    setFormError("");
  }

  async function removeGroup(id) {
    try {
      setListError("");
      await deleteGroup(id);
      await loadGroups();
    } catch (error) {
      setListError(error.message || "Unable to delete group");
    }
  }

  function updateSort(field) {
    if (sortField === field) {
      setSortDirection(direction => direction === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

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
    setCurrentPage(1);
  }

  function clearColumnFilters() {
    setColumnFilters({});
    setCurrentPage(1);
  }

  function openGroupPersons(group) {
    setPersonGroup(group);
  }

  function renderActions(group) {
    return (
      <div className="d-inline-flex align-items-center gap-2">
        <button type="button" className="btn btn-sm btn-outline-secondary me-1" title="Show Persons" onClick={() => openGroupPersons(group)}>
          <i className="bi bi-people" aria-hidden="true" />
        </button>
        <button type="button" className="btn btn-sm btn-outline-secondary me-1" title="View" onClick={() => viewGroup(group)}>
          <i className="bi bi-eye" aria-hidden="true" />
        </button>
        {isAdmin ? (
          <button type="button" className="btn btn-sm btn-outline-secondary me-1" title="Update" onClick={() => openUpdateGroup(group)}>
            <i className="bi bi-pencil-square" aria-hidden="true" />
          </button>
        ) : null}
        {isAdmin ? (
          <button type="button" className="btn btn-sm btn-outline-danger" title="Delete" onClick={() => removeGroup(group.id)}>
            <i className="bi bi-trash" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    );
  }

  const columns = [
    { field: "id", label: "Id" },
    { field: "name", label: "Name", className: "fw-semibold" },
    { field: "createdByName", label: "Created By" },
    { field: "currentUserRole", label: "My Role", render: value => value || "" },
    { field: "createdOn", label: "Created On", render: formatDateTime }
  ];

  if (editor) {
    return (
      <GroupEditorPage
        error={editor.mode === "view" ? "" : formError}
        group={editor.group}
        mode={editor.mode}
        persons={persons}
        onBack={closeEditor}
        onClearError={() => setFormError("")}
        onSave={saveGroup}
      />
    );
  }

  if (personGroup) {
    return (
      <PersonList
        groupId={personGroup.id}
        title={"Persons for " + personGroup.name}
        onBack={() => setPersonGroup(null)}
      />
    );
  }

  return (
    <div className="view-fill">
      {listError ? (
        <div className="alert alert-danger alert-dismissible d-flex align-items-center justify-content-between gap-2">
          <span>{listError}</span>
          <button type="button" className="btn btn-sm btn-outline-secondary alert-icon-button" title="Hide" onClick={() => setListError("")}>
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>
      ) : null}
      <DataTable
        addIcon="bi bi-collection"
        addLabel="Add New Group"
        columnFilters={columnFilters}
        columns={columns}
        currentPage={safePage}
        emptyText="No groups found"
        exportRows={visibleGroups}
        filteredCount={visibleGroups.length}
        icon="bi bi-collection"
        onAdd={isAdmin ? openNewGroup : null}
        onClearColumnFilters={clearColumnFilters}
        onColumnFilter={updateColumnFilter}
        onPage={setCurrentPage}
        onSort={updateSort}
        renderActions={renderActions}
        rows={pageGroups}
        searchFields={["name"]}
        searchInputId="group-search"
        sortDirection={sortDirection}
        sortField={sortField}
        title="Groups"
        totalCount={groups.length}
        totalPages={totalPages}
      />

    </div>
  );
}
