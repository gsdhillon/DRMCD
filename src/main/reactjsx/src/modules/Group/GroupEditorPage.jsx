import { useMemo, useState } from "react";
import { valueOrEmpty } from "../../common/Helpers.js";
import { useRenderDebug } from "../../common/useRenderDebug.js";
import { getPerson } from "../../services/personService.js";
import { PersonForm } from "../Person/PersonForm.jsx";
import { PersonTable } from "../Person/PersonTable.jsx";

const EMPTY_GROUP = {
  name: "",
  members: []
};

export function createEmptyGroup() {
  return { ...EMPTY_GROUP, members: [] };
}

function normalizedMembers(group, persons) {
  return (group?.members || []).map(member => {
    const person = persons.find(candidate => Number(candidate.id) === Number(member.pId)) || member.person || {};

    return {
      ...person,
      ...member,
      id: member.pId,
      name: member.personName || person.name || String(member.pId || ""),
      role: member.role === "admin" ? "admin" : "user"
    };
  });
}

function editorTitle(mode) {
  if (mode === "view") {
    return "Group Details";
  }

  return mode === "update" ? "Update Group" : "Add New Group";
}

export function GroupEditorPage({
  group,
  mode = "add",
  onBack,
  onSave,
  persons = []
}) {
  useRenderDebug("GroupEditorPage");

  const editable = mode !== "view";
  const [draft, setDraft] = useState(() => ({ ...EMPTY_GROUP, ...(group || {}) }));
  const [members, setMembers] = useState(() => normalizedMembers(group, persons));
  const [personDialog, setPersonDialog] = useState(null);
  const memberIds = useMemo(() => new Set(members.map(member => Number(member.id || member.pId))), [members]);
  const availablePersons = persons.filter(person => !memberIds.has(Number(person.id)));

  function addPerson(person) {
    setMembers(current => current.concat({
      ...person,
      pId: person.id,
      role: "user"
    }));
  }

  function removePerson(person) {
    setMembers(current => current.filter(member => Number(member.id || member.pId) !== Number(person.id || person.pId)));
  }

  async function viewPerson(person) {
    try {
      setPersonDialog(await getPerson(person.id || person.pId));
    } catch (error) {
      setPersonDialog(person);
    }
  }

  async function save() {
    const result = await onSave?.({
      ...draft,
      members: members.map(member => ({
        gId: draft.id,
        pId: Number(member.id || member.pId),
        personName: member.name || member.personName,
        role: member.role === "admin" ? "admin" : "user"
      }))
    });

    if (result !== false) {
      onBack?.();
    }
  }

  return (
    <div className="view-fill group-editor-page">
      <div className="editor-page-toolbar d-flex align-items-center justify-content-between gap-3">
        <h2 className="d-flex align-items-center fs-4 fw-bold m-0">
          <i className="bi bi-collection me-2" aria-hidden="true" />
          {editorTitle(mode)}
        </h2>
        <div className="editor-page-actions">
          <button type="button" className="btn btn-outline-secondary table-add-button table-nav-button" title="Back to Groups" aria-label="Back to Groups" onClick={onBack}>
            <i className="bi bi-arrow-left fw-bold" aria-hidden="true" />
          </button>
        </div>
      </div>

      <section className="group-editor-fields">
        <label className="form-row">
          <span>Name</span>
          <input
            className="form-control"
            disabled={!editable}
            placeholder="Group name"
            value={valueOrEmpty(draft.name)}
            onChange={event => setDraft(current => ({ ...current, name: event.target.value }))}
          />
        </label>
        {mode === "view" ? (
          <>
            <label className="form-row">
              <span>Created By</span>
              <input className="form-control" disabled value={valueOrEmpty(draft.createdByName || draft.createdBy)} />
            </label>
            <label className="form-row">
              <span>Created On</span>
              <input className="form-control" disabled value={valueOrEmpty(draft.createdOn)} />
            </label>
          </>
        ) : null}
      </section>

      <section className={"group-editor-persons" + (!editable ? " group-editor-persons-single" : "")}>
        <div className="group-person-table">
          <PersonTable
            actions={editable ? [{
              icon: "bi bi-person-dash",
              title: "Remove from group",
              onClick: removePerson
            }] : []}
            columnFields={["id", "name"]}
            emptyText="No persons added"
            icon="bi bi-people"
            onView={viewPerson}
            pageSize={0}
            rows={members}
            searchFields={["id", "name"]}
            searchInputId="group-added-person-search"
            searchPlaceholder="Search added"
            title="Added Persons"
          />
        </div>
        {editable ? (
          <div className="group-person-table">
            <PersonTable
              actions={[{
                icon: "bi bi-person-plus",
                title: "Add to group",
                onClick: addPerson
              }]}
              columnFields={["id", "name"]}
              emptyText="No persons available"
              icon="bi bi-people"
              onView={viewPerson}
              pageSize={0}
              rows={availablePersons}
              searchFields={["id", "name"]}
              searchInputId="group-available-person-search"
              searchPlaceholder="Search available"
              title="Available Persons"
            />
          </div>
        ) : null}
      </section>

      <div className="d-flex flex-wrap align-items-center justify-content-end gap-2 mt-1">
        {editable ? (
          <button type="button" className="btn btn-primary" onClick={save}>
            <i className={(mode === "update" ? "bi bi-check2-circle" : "bi bi-plus-lg") + " me-2"} aria-hidden="true" />
            {mode === "update" ? "Update Group" : "Add Group"}
          </button>
        ) : null}
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
    </div>
  );
}
