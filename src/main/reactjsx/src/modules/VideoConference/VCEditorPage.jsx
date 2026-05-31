import { useMemo, useState } from "react";
import { valueOrEmpty } from "../../common/Helpers.js";
import { useRenderDebug } from "../../common/useRenderDebug.js";
import { getPerson } from "../../services/personService.js";
import { PersonForm } from "../Person/PersonForm.jsx";
import { PersonTable } from "../Person/PersonTable.jsx";
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

  const [draft, setDraft] = useState(() => normalizeConference(conference));
  const [participants, setParticipants] = useState(() => normalizeConference(conference).participants);
  const [personDialog, setPersonDialog] = useState(null);
  const { closeHelp, helpDialog, helpError, helpLoading, openHelp } = useVCHelpDialog();
  const participantIds = useMemo(
    () => new Set(participants.map(person => Number(person.id))),
    [participants]
  );
  const availablePersons = persons.filter(person => !participantIds.has(Number(person.id)));

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
        </h2>
        <div className="editor-page-actions d-inline-flex align-items-center gap-2">
          <button type="button" className="btn btn-outline-secondary table-add-button table-help-button" title="Help" aria-label="Help" onClick={openHelp}>
            <i className="bi bi-question-circle" aria-hidden="true" />
          </button>
          <button type="button" className="btn btn-outline-secondary table-add-button table-nav-button" title="Back to Video Conferences" aria-label="Back to Video Conferences" onClick={onBack}>
            <i className="bi bi-arrow-left fw-bold" aria-hidden="true" />
          </button>
        </div>
      </div>

      <section className="vc-editor-fields">
        <label className="form-row">
          <span>Title</span>
          <input
            className="form-control"
            placeholder="Video conference title"
            value={valueOrEmpty(draft.title)}
            onChange={event => patch("title", event.target.value)}
          />
        </label>
        <label className="form-row">
          <span>Scheduled</span>
          <input
            className="form-control"
            type="datetime-local"
            value={valueOrEmpty(draft.scheduledAt)}
            onChange={event => patch("scheduledAt", event.target.value)}
          />
        </label>
        <label className="form-row">
          <span>Duration</span>
          <div className="input-group">
            <input
              className="form-control"
              step="5"
              type="number"
              value={valueOrEmpty(draft.durationMinutes)}
              onChange={event => patch("durationMinutes", event.target.value)}
            />
            <span className="input-group-text">minutes</span>
          </div>
        </label>
      </section>

      <section className="vc-editor-persons">
        <div className="vc-person-table">
          <PersonTable
            actions={[{
              icon: "bi bi-person-dash",
              title: "Remove from VC",
              onClick: removePerson
            }]}
            columnFields={["id", "name"]}
            emptyText="No persons added"
            icon="bi bi-people"
            onView={viewPerson}
            pageSize={0}
            rows={participants}
            searchFields={["id", "name"]}
            searchInputId="vc-added-person-search"
            searchPlaceholder="Search added"
            title="Added Persons"
          />
        </div>
        <div className="vc-person-table">
          <PersonTable
            actions={[{
              icon: "bi bi-person-plus",
              title: "Add to VC",
              onClick: addPerson
            }]}
            columnFields={["id", "name"]}
            emptyText="No persons available"
            icon="bi bi-people"
            onView={viewPerson}
            pageSize={0}
            rows={availablePersons}
            searchFields={["id", "name"]}
            searchInputId="vc-available-person-search"
            searchPlaceholder="Search available"
            title="Available Persons"
          />
        </div>
      </section>

      <div className="d-flex flex-wrap align-items-center justify-content-end gap-2 mt-1">
        <button type="button" className="btn btn-primary" onClick={save}>
          <i className={(mode === "update" ? "bi bi-check2-circle" : "bi bi-calendar-plus") + " me-2"} aria-hidden="true" />
          {mode === "update" ? "Update VC" : "Schedule VC"}
        </button>
        <button type="button" className="btn btn-secondary dialog-close-button" onClick={onBack}>
          <i className="bi bi-x-circle me-2" aria-hidden="true" />
          Close
        </button>
      </div>

      {personDialog ? (
        <PersonForm
          editable={false}
          mode="view"
          person={personDialog}
          onClose={() => setPersonDialog(null)}
        />
      ) : null}

      <VCHelpDialog help={helpDialog} error={helpError} loading={helpLoading} onClose={closeHelp} />
    </div>
  );
}
