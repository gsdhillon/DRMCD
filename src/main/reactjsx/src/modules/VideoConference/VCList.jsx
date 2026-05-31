import { useEffect, useMemo, useState } from "react";
import { useRenderDebug } from "../../common/useRenderDebug.js";
import { Button } from "../../common/Button.jsx";
import { DataTable } from "../../common/DataTable.jsx";
import { getPersons } from "../../services/personService.js";
import {
  createVideoConference,
  deleteVideoConference,
  getVideoConferences,
  updateVideoConference
} from "../../services/vcService.js";
import { useApp } from "../../state/AppContext.jsx";
import { PersonList } from "../Person/PersonList.jsx";
import { newVideoConference, VCEditorPage } from "./VCEditorPage.jsx";
import { VCHelpDialog, useVCHelpDialog } from "./VCHelpDialog.jsx";
import { VCRoom } from "./VCRoom.jsx";

const pageSize = 10;

function searchableValue(value) {
  return value === undefined || value === null ? "" : String(value).toLowerCase();
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value).replace("T", " ") : date.toLocaleString();
}

function compareConferences(sortField, sortDirection) {
  return (first, second) => {
    const firstValue = sortField === "scheduledAt"
      ? new Date(first.scheduledAt || 0).getTime()
      : searchableValue(first[sortField]);
    const secondValue = sortField === "scheduledAt"
      ? new Date(second.scheduledAt || 0).getTime()
      : searchableValue(second[sortField]);
    const result = typeof firstValue === "number"
      ? firstValue - secondValue
      : firstValue.localeCompare(secondValue);

    return sortDirection === "asc" ? result : -result;
  };
}

function matchesColumnFilters(item, columnFilters) {
  return Object.entries(columnFilters).every(([field, term]) => {
    const normalizedTerm = String(term || "").trim().toLowerCase();
    return !normalizedTerm || searchableValue(item[field]).includes(normalizedTerm);
  });
}

function toInputDateTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value || "").slice(0, 16);
  }

  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function VCList() {
  useRenderDebug("VCList");

  const { showError, user } = useApp();
  const [conferences, setConferences] = useState([]);
  const [persons, setPersons] = useState([]);
  const [activeConference, setActiveConference] = useState(null);
  const [editor, setEditor] = useState(null);
  const [personConference, setPersonConference] = useState(null);
  const [columnFilters, setColumnFilters] = useState({});
  const [sortField, setSortField] = useState("scheduledAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const { closeHelp, helpDialog, helpError, helpLoading, openHelp } = useVCHelpDialog();

  async function loadConferences() {
    try {
      setConferences(await getVideoConferences());
    } catch (error) {
      showError(error.message || "Unable to load video conferences");
      setConferences([]);
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
    loadPersons();
    loadConferences();
  }, []);

  const visibleConferences = useMemo(() => {
    return conferences
      .filter(conference => matchesColumnFilters(conference, columnFilters))
      .sort(compareConferences(sortField, sortDirection));
  }, [columnFilters, conferences, sortDirection, sortField]);

  const totalPages = Math.max(1, Math.ceil(visibleConferences.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageConferences = visibleConferences.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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

  function hydrateConference(conference) {
    return {
      ...conference,
      scheduledAt: toInputDateTime(conference.scheduledAt),
      durationMinutes: conference.durationMinutes || 30,
      participants: (conference.participants || []).map(participant => {
        const fullPerson = persons.find(person => Number(person.id) === Number(participant.id));
        return fullPerson ? { ...participant, ...fullPerson } : participant;
      })
    };
  }

  function openAdd() {
    setEditor({
      mode: "add",
      conference: newVideoConference()
    });
  }

  function openUpdate(conference) {
    setEditor({
      mode: "update",
      conference: hydrateConference(conference)
    });
  }

  function openPersons(conference) {
    setPersonConference(hydrateConference(conference));
  }

  function closeEditor() {
    setEditor(null);
  }

  async function saveConference(conference) {
    try {
      if (editor?.mode === "update") {
        await updateVideoConference(conference);
      } else {
        await createVideoConference(conference);
      }

      setEditor(null);
      await loadConferences();
      return true;
    } catch (error) {
      showError(error.message || "Unable to save video conference");
      return false;
    }
  }

  async function removeConference(conference) {
    try {
      await deleteVideoConference(conference.id);
      await loadConferences();
    } catch (error) {
      showError(error.message || "Unable to delete video conference");
    }
  }

  function canDelete(conference) {
    return conference.creator || user?.role === "SuperAdmin";
  }

  function renderActions(conference) {
    return (
      <div className="d-inline-flex align-items-center gap-2">
        <Button
          className={"btn btn-sm " + (conference.startAllowed ? "btn-outline-primary" : "btn-outline-secondary")}
          icon="bi bi-camera-video"
          title={conference.startAllowed ? "Start VC" : "Start VC is not available yet"}
          onClick={() => conference.startAllowed && setActiveConference(conference)}
        />
        <Button className="btn btn-sm btn-outline-secondary" icon="bi bi-people" title="View Participants" onClick={() => openPersons(conference)} />
        {conference.creator ? (
          <Button className="btn btn-sm btn-outline-secondary" icon="bi bi-pencil-square" title="Update VC" onClick={() => openUpdate(conference)} />
        ) : null}
        {canDelete(conference) ? (
          <Button className="btn btn-sm btn-outline-danger" icon="bi bi-trash" title="Delete VC" onClick={() => removeConference(conference)} />
        ) : null}
      </div>
    );
  }

  if (activeConference) {
    return (
      <VCRoom
        conference={activeConference}
        onClose={() => {
          setActiveConference(null);
          loadConferences();
        }}
      />
    );
  }

  if (personConference) {
    return (
      <PersonList
        backTitle="Back to Video Conferences"
        onBack={() => setPersonConference(null)}
        persons={personConference.participants || []}
        title={"Persons for " + (personConference.title || "Video Conference")}
      />
    );
  }

  if (editor) {
    return (
      <VCEditorPage
        conference={editor.conference}
        mode={editor.mode}
        onBack={closeEditor}
        onSave={saveConference}
        persons={persons.filter(person => Number(person.id) !== Number(user?.personId))}
      />
    );
  }

  return (
    <div className="view-fill">
      <DataTable
        addIcon="bi bi-camera-video"
        addLabel="Schedule Video Conference"
        columnFilters={columnFilters}
        columns={[
          { field: "id", label: "Id" },
          { field: "title", label: "Title", className: "fw-semibold" },
          { field: "scheduledAt", label: "Scheduled", render: formatDateTime },
          { field: "createdByName", label: "Creator" },
          { field: "durationMinutes", label: "Duration", render: value => String(value || 30) + " min" }
        ]}
        currentPage={safePage}
        emptyText="No video conferences found"
        exportRows={visibleConferences}
        filteredCount={visibleConferences.length}
        icon="bi bi-camera-video-fill"
        onAdd={openAdd}
        onClearColumnFilters={clearColumnFilters}
        onColumnFilter={updateColumnFilter}
        onPage={setCurrentPage}
        onSort={updateSort}
        renderActions={renderActions}
        rows={pageConferences}
        searchFields={["title"]}
        searchInputId="vc-search"
        sortDirection={sortDirection}
        sortField={sortField}
        title="Video Conferences"
        toolbarActions={(
          <Button className="btn btn-outline-secondary table-add-button table-help-button" icon="bi bi-question-circle" title="Help" onClick={openHelp} />
        )}
        totalCount={conferences.length}
        totalPages={totalPages}
      />
      <VCHelpDialog help={helpDialog} error={helpError} loading={helpLoading} onClose={closeHelp} />
    </div>
  );
}
