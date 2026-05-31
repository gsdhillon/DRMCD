import { useEffect, useMemo, useState } from "react";
import { Button } from "../../common/Button.jsx";
import { Input } from "../../common/form/Input.jsx";
import { useRenderDebug } from "../../common/useRenderDebug.js";
import { getPerson } from "../../services/personService.js";
import { getRoles } from "../../services/roleService.js";
import { useApp } from "../../state/AppContext.jsx";
import { PersonDialog } from "../Person/PersonDialog.jsx";
import { PersonListSelector } from "../Person/PersonListSelector.jsx";
import { VCHelpDialog, useVCHelpDialog } from "./VCHelpDialog.jsx";

function toInputDateTime(value) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function emptyConference() {
  const scheduledAt = new Date(Date.now() + 10 * 60000);
  scheduledAt.setSeconds(0, 0);

  return {
    title: "",
    scheduledAt: toInputDateTime(scheduledAt),
    durationMinutes: 30,
    participants: []
  };
}

function normalizeConference(conference) {
  const empty = emptyConference();

  return {
    ...empty,
    ...(conference || {}),
    scheduledAt: toInputDateTime(conference?.scheduledAt || empty.scheduledAt),
    durationMinutes: conference?.durationMinutes || 30,
    participants: conference?.participants || []
  };
}

function editorTitle(mode) {
  return mode === "update" ? "Update Video Conference" : "Schedule Video Conference";
}

export function newVideoConference() {
  return emptyConference();
}

export function VCEditorPage({
  conference,
  mode = "add",
  onBack,
  onSave,
  persons = []
}) {
  useRenderDebug("VCEditorPage");

  const { showError } = useApp();
  const [draft, setDraft] = useState(() => normalizeConference(conference));
  const [participants, setParticipants] = useState(() => normalizeConference(conference).participants);
  const [personDialog, setPersonDialog] = useState(null);
  const [roles, setRoles] = useState([]);
  const { closeHelp, helpDialog, helpError, helpLoading, openHelp } = useVCHelpDialog();
  const participantIds = useMemo(
    () => new Set(participants.map(person => Number(person.id))),
    [participants]
  );
  const availablePersons = persons.filter(person => !participantIds.has(Number(person.id)));

  useEffect(() => {
    async function loadRoles() {
      try {
        setRoles(await getRoles());
      } catch (error) {
        showError(error.message || "Unable to load roles");
        setRoles([]);
      }
    }

    loadRoles();
  }, []);

  function patch(field, value) {
    setDraft(current => ({
      ...current,
      [field]: value
    }));
  }

  function addPerson(person) {
    setParticipants(current => current.concat(person));
  }

  function removePerson(person) {
    setParticipants(current => current.filter(participant => Number(participant.id) !== Number(person.id)));
  }

  async function viewPerson(person) {
    if (roles.length === 0) {
      showError("At least one role is required to view person details.");
      return;
    }

    try {
      setPersonDialog(await getPerson(person.id));
    } catch (error) {
      setPersonDialog(person);
    }
  }

  async function save() {
    const result = await onSave?.({
      ...draft,
      durationMinutes: Number(draft.durationMinutes || 30),
      participants: participants.map(person => ({
        ...person,
        id: Number(person.id)
      }))
    });

    if (result !== false) {
      onBack?.();
    }
  }

  return (
    <div className="view-fill vc-editor-page">
      <div className="editor-page-toolbar d-flex align-items-center justify-content-between gap-3">
        <h2 className="d-flex align-items-center fs-4 fw-bold m-0">
          <i className="bi bi-camera-video me-2" aria-hidden="true" />
          {editorTitle(mode)}
          {draft.id ? <strong className="editor-record-id ms-3">Id: {draft.id}</strong> : null}
        </h2>
        <div className="editor-page-actions d-inline-flex align-items-center gap-2">
          <Button className="btn btn-outline-secondary table-add-button table-help-button" icon="bi bi-question-circle" title="Help" onClick={openHelp} />
          <Button className="btn btn-outline-secondary table-add-button table-nav-button" icon="bi bi-arrow-left fw-bold" title="Back to Video Conferences" onClick={onBack} />
        </div>
      </div>

      <section className="vc-editor-fields">
        <Input
          label="Title"
          placeholder="Video conference title"
          value={draft.title}
          onChange={value => patch("title", value)}
        />
        <Input
          label="Duration"
          step="5"
          suffix="minutes"
          type="number"
          value={draft.durationMinutes}
          onChange={value => patch("durationMinutes", value)}
        />
        <Input label="By" editable={false} value={draft.createdByName || draft.createdBy} />
        <Input
          label="Scheduled"
          type="datetime-local"
          value={draft.scheduledAt}
          onChange={value => patch("scheduledAt", value)}
        />
      </section>

      <PersonListSelector
        className="vc-editor-persons"
        onView={viewPerson}
        selected={{
          actions: [{
              icon: "bi bi-person-dash",
              title: "Remove from VC",
              onClick: removePerson
            }],
          className: "vc-person-table",
          emptyText: "No persons added",
          rows: participants,
          searchInputId: "vc-added-person-search",
          searchPlaceholder: "Search added",
          title: "Added Persons"
        }}
        available={{
          actions: [{
              icon: "bi bi-person-plus",
              title: "Add to VC",
              onClick: addPerson
            }],
          className: "vc-person-table",
          emptyText: "No persons available",
          rows: availablePersons,
          searchInputId: "vc-available-person-search",
          searchPlaceholder: "Search available",
          title: "Available Persons"
        }}
      />

      <div className="d-flex flex-wrap align-items-center justify-content-end gap-2 mt-1">
        <Button className="btn btn-primary" icon={mode === "update" ? "bi bi-check2-circle" : "bi bi-calendar-plus"} label={mode === "update" ? "Update VC" : "Schedule VC"} onClick={save} />
        <Button className="btn btn-secondary dialog-close-button" icon="bi bi-x-circle" label="Close" onClick={onBack} />
      </div>

      {personDialog && roles.length > 0 ? (
        <PersonDialog
          editable={false}
          mode="view"
          person={personDialog}
          roles={roles}
          onClose={() => setPersonDialog(null)}
        />
      ) : null}

      <VCHelpDialog help={helpDialog} error={helpError} loading={helpLoading} onClose={closeHelp} />
    </div>
  );
}
