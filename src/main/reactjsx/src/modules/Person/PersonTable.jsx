import { useEffect, useMemo, useState } from "react";
import { useRenderDebug } from "../../common/useRenderDebug.js";
import { Button } from "../../common/Button.jsx";
import { DataTable } from "../../common/DataTable.jsx";
import { PersonThumbnail } from "../../common/PersonThumbnail.jsx";

const DEFAULT_COLUMNS = [
  { field: "id", label: "Id" },
  { field: "name", label: "Name", className: "fw-semibold" },
  { field: "email", label: "Email" },
  { field: "mobileNo", label: "Mobile No" },
  { field: "designation", label: "Designation" },
  { field: "role", label: "Role" }
];

function searchableValue(value) {
  return value === undefined || value === null ? "" : String(value).toLowerCase();
}

function comparePersons(sortField, sortDirection) {
  return (first, second) => {
    const firstValue = first[sortField];
    const secondValue = second[sortField];
    const result = sortField === "id"
      ? Number(firstValue || 0) - Number(secondValue || 0)
      : searchableValue(firstValue).localeCompare(searchableValue(secondValue));

    return sortDirection === "asc" ? result : -result;
  };
}

function selectedColumns(columnFields) {
  if (!columnFields?.length) {
    return DEFAULT_COLUMNS;
  }

  return DEFAULT_COLUMNS.filter(column => columnFields.includes(column.field));
}

function matchesColumnFilters(item, columnFilters) {
  return Object.entries(columnFilters).every(([field, term]) => {
    const normalizedTerm = String(term || "").trim().toLowerCase();
    return !normalizedTerm || searchableValue(item[field]).includes(normalizedTerm);
  });
}

export function PersonTable({
  actionLabel = "Action",
  actions = [],
  addIcon = "bi bi-person-fill",
  addLabel = "Add New Person",
  columnFields,
  emptyText = "No persons found",
  icon = "bi bi-people-fill",
  onAdd,
  onView,
  pageSize = 10,
  rows = [],
  searchFields = ["name"],
  searchInputId = "person-search",
  title = "Persons",
  toolbarActions
}) {
  useRenderDebug("PersonTable");

  const [columnFilters, setColumnFilters] = useState({});
  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const columns = useMemo(() => selectedColumns(columnFields), [columnFields]);
  const visiblePersons = useMemo(() => {
    return rows
      .filter(person => matchesColumnFilters(person, columnFilters))
      .sort(comparePersons(sortField, sortDirection));
  }, [columnFilters, rows, sortDirection, sortField]);
  const paginationEnabled = Boolean(pageSize);
  const totalPages = paginationEnabled ? Math.max(1, Math.ceil(visiblePersons.length / pageSize)) : 1;
  const safePage = paginationEnabled ? Math.min(currentPage, totalPages) : 1;
  const pagePersons = paginationEnabled
    ? visiblePersons.slice((safePage - 1) * pageSize, safePage * pageSize)
    : visiblePersons;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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

  function updateSort(field) {
    if (sortField === field) {
      setSortDirection(direction => direction === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  function renderActions(person) {
    const visibleActions = actions.filter(action => !action.show || action.show(person));

    if (!onView && visibleActions.length === 0) {
      return null;
    }

    return (
      <div className="d-inline-flex align-items-center gap-2">
        {onView ? (
          <PersonThumbnail
            name={person.name}
            photo={person.thumbnail || person.photo}
            role={person.role}
            roleColor={person.roleColor}
            title="View"
            onClick={() => onView(person)}
          />
        ) : null}
        {visibleActions.map(action => (
          <Button
            key={action.title}
            color={action.color || "primary-line"}
            icon={action.icon}
            me={action.me}
            size={action.size || "sm"}
            title={action.title}
            onClick={() => action.onClick?.(person)}
          />
        ))}
      </div>
    );
  }

  return (
    <DataTable
      actionLabel={actionLabel}
      addIcon={addIcon}
      addLabel={addLabel}
      columnFilters={columnFilters}
      columns={columns}
      currentPage={safePage}
      emptyText={emptyText}
      exportRows={visiblePersons}
      filteredCount={visiblePersons.length}
      icon={icon}
      onAdd={onAdd}
      onClearColumnFilters={clearColumnFilters}
      onColumnFilter={updateColumnFilter}
      onPage={paginationEnabled ? setCurrentPage : null}
      onSort={updateSort}
      renderActions={onView || actions.length ? renderActions : null}
      rows={pagePersons}
      searchFields={searchFields}
      searchInputId={searchInputId}
      sortDirection={sortDirection}
      sortField={sortField}
      title={title}
      toolbarActions={toolbarActions}
      totalCount={rows.length}
      totalPages={totalPages}
    />
  );
}
