import { useEffect, useMemo, useState } from "react";
import { useRenderDebug } from "../../common/useRenderDebug.js";
import { Button } from "../../common/Button.jsx";
import { useCenterPanel } from "../../common/CenterPanel.jsx";
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

  const { auth, showError } = useApp();
  const centerPanel = useCenterPanel();
  const [groups, setGroups] = useState([]);
  const [persons, setPersons] = useState([]);
  const [columnFilters, setColumnFilters] = useState({});
  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);

  const isAdmin = auth?.role === "Admin" || auth?.role === "SuperAdmin";

  async function loadGroups() {
    try {
      setGroups(await getGroups());
    } catch (error) {
      showError(error.message || "Unable to load groups");
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
    centerPanel?.pushPage({
      title: "Add",
      content: (
        <GroupEditorPage
          group={createEmptyGroup()}
          mode="add"
          persons={persons}
          onBack={centerPanel.goBack}
          onSave={group => saveGroup(group, "add")}
        />
      )
    });
  }

  async function openUpdateGroup(group) {
    let editorGroup = group;

    try {
      editorGroup = await getGroup(group.id);
    } catch (error) {
      editorGroup = group;
    }

    centerPanel?.pushPage({
      title: "Update",
      content: (
        <GroupEditorPage
          group={editorGroup}
          mode="update"
          persons={persons}
          onBack={centerPanel.goBack}
          onSave={groupToSave => saveGroup(groupToSave, "update")}
        />
      )
    });
  }

  async function viewGroup(group) {
    let editorGroup = group;

    try {
      editorGroup = await getGroup(group.id);
    } catch (error) {
      editorGroup = group;
    }

    centerPanel?.pushPage({
      title: "Group Details",
      content: (
        <GroupEditorPage
          group={editorGroup}
          mode="view"
          persons={persons}
          onBack={centerPanel.goBack}
        />
      )
    });
  }

  async function saveGroup(group, mode) {
    try {
      if (mode === "update") {
        await updateGroup(group);
      } else {
        await createGroup(group);
      }

      await loadGroups();
      return true;
    } catch (error) {
      showError(error.message || "Unable to save group");
      return false;
    }
  }

  function openGroupPersons(group) {
    centerPanel?.pushPage({
      title: "Persons for " + group.name,
      content: (
        <PersonList
          groupId={group.id}
          title={"Persons for " + group.name}
        />
      )
    });
  }

  async function removeGroup(id) {
    try {
      await deleteGroup(id);
      await loadGroups();
    } catch (error) {
      showError(error.message || "Unable to delete group");
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

  function renderActions(group) {
    return (
      <div className="d-inline-flex align-items-center gap-2">
        <Button color="secondary-line" size="sm" me={1} icon="people" title="Show Persons" onClick={() => openGroupPersons(group)} />
        <Button color="secondary-line" size="sm" me={1} icon="eye" title="View" onClick={() => viewGroup(group)} />
        {isAdmin ? (
          <Button color="secondary-line" size="sm" me={1} icon="pencil-square" title="Update" onClick={() => openUpdateGroup(group)} />
        ) : null}
        {isAdmin ? (
          <Button color="danger-line" size="sm" icon="trash" title="Delete" onClick={() => removeGroup(group.id)} />
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

  return (
    <div className="view-fill">
      <DataTable
        addIcon="bi bi-collection"
        addLabel="Add New Group"
        centerPanelToolbar
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
        showTitle={false}
        totalCount={groups.length}
        totalPages={totalPages}
      />

    </div>
  );
}
