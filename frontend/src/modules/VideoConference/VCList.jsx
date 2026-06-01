import { useEffect, useMemo, useState } from "react";
import { useRenderDebug } from "../../common/useRenderDebug.js";
import { Button } from "../../components/Button.jsx";
import { useCenterPanel } from "../../components/CenterPanel.jsx";
import { DataTable } from "../../common/DataTable.jsx";
import { getPersons } from "../../services/personService.js";
import {
  createVideoConference,
  deleteVideoConference,
  getVideoConferences,
  updateVideoConference
} from "../../services/vcService.js";
import { useApp } from "../../app/AppContext.jsx";
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

  if (Number.isNaN(date.getTime())) {
    return String(value).replace("T", " ");
  }

  const pad = number => String(number).padStart(2, "0");

  return [
    pad(date.getDate()),
    pad(date.getMonth() + 1),
    date.getFullYear()
  ].join("/") + " " + [
    pad(date.getHours()),
    pad(date.getMinutes())
  ].join(":");
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
  const centerPanel = useCenterPanel();
  const [conferences, setConferences] = useState([]);
  const [persons, setPersons] = useState([]);
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
    void loadPersons();
    void loadConferences();
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
    centerPanel?.pushPage({
      title: "Schedule",
      content: (
        <VCEditorPage
          conference={newVideoConference()}
          mode="add"
          onBack={centerPanel.goBack}
          onSave={conference => saveConference(conference, "add")}
          persons={persons.filter(person => Number(person.id) !== Number(user?.personId))}
        />
      )
    });
  }

  function openUpdate(conference) {
    centerPanel?.pushPage({
      title: "Update",
      content: (
        <VCEditorPage
          conference={hydrateConference(conference)}
          mode="update"
          onBack={centerPanel.goBack}
          onSave={conferenceToSave => saveConference(conferenceToSave, "update")}
          persons={persons.filter(person => Number(person.id) !== Number(user?.personId))}
        />
      )
    });
  }

  function openPersons(conference) {
    const hydratedConference = hydrateConference(conference);

    centerPanel?.pushPage({
      title: "Participants",
      content: (
        <PersonList
          persons={hydratedConference.participants || []}
          title={"Participants of " + (hydratedConference.title || "Video Conference")}
        />
      )
    });
  }

  function openRoom(conference) {
    centerPanel?.pushPage({
      // Ishjyot [01/06/2026]
      currentTitleOnly: true,
      title: (conference.title || "Video Conference") + " (id: " + conference.id + " )",
      content: (
        <VCRoom
          conference={conference}
          onClose={() => {
            centerPanel.goBack();
            loadConferences();
          }}
        />
      )
    });
  }

  async function saveConference(conference, mode) {
    try {
      if (mode === "update") {
        await updateVideoConference(conference);
      } else {
        await createVideoConference(conference);
      }

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
            color="secondary-line"
            size="sm"
            disabled={!conference.startAllowed}
            icon="camera-video"
            title={conference.startAllowed ? "Start VC" : "Start VC is not available yet"}
            onClick={() => openRoom(conference)}
        />
        <Button
            color="secondary-line"
            size="sm" icon="people"
            title="View Participants"
            onClick={() => openPersons(conference)}
        />
        <Button
            render={conference.creator}
            color="secondary-line"
            size="sm"
            icon="pencil-square"
            title="Update VC"
            onClick= { () => openUpdate(conference)}
        />
        <Button
            render={canDelete(conference)}
            color="danger-line"
            size="sm"
            icon="trash"
            title="Delete VC"
            onClick={() => removeConference(conference)}
        />
      </div>
    );
  }

  return (
    <div className="view-fill">
      <DataTable
        addIcon="bi bi-camera-video"
        addLabel="Schedule Video Conference"
        centerPanelToolbar
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
        showTitle={false}
        toolbarActions={(
          <Button
              color="secondary-line"
              size="sm"
              icon="question-circle"
              title="Help" onClick={openHelp}
          />
        )}
        totalCount={conferences.length}
        totalPages={totalPages}
      />
      <VCHelpDialog
          help={helpDialog}
          error={helpError}
          loading={helpLoading}
          onClose={closeHelp}
      />
    </div>
  );
}
