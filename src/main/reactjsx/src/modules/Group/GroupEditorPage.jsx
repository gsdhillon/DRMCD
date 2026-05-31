import { useEffect, useMemo, useState } from "react";
import { Button } from "../../common/Button.jsx";
import { Input } from "../../common/form/Input.jsx";
import { useRenderDebug } from "../../common/useRenderDebug.js";
import { getPerson } from "../../services/personService.js";
import { getRoles } from "../../services/roleService.js";
import { useApp } from "../../state/AppContext.jsx";
import { PersonDialog } from "../Person/PersonDialog.jsx";
import { PersonListSelector } from "../Person/PersonListSelector.jsx";

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

  const { showError } = useApp();
  const editable = mode !== "view";
  const [draft, setDraft] = useState(() => ({ ...EMPTY_GROUP, ...(group || {}) }));
  const [members, setMembers] = useState(() => normalizedMembers(group, persons));
  const [personDialog, setPersonDialog] = useState(null);
  const [roles, setRoles] = useState([]);
  const memberIds = useMemo(() => new Set(members.map(member => Number(member.id || member.pId))), [members]);
  const availablePersons = persons.filter(person => !memberIds.has(Number(person.id)));

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
    if (roles.length === 0) {
      showError("At least one role is required to view person details.");
      return;
    }

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
          {draft.id ? <strong className="editor-record-id ms-3">Id: {draft.id}</strong> : null}
        </h2>
        <div className="editor-page-actions">
          <Button look="table-nav" icon="bi bi-arrow-left fw-bold" title="Back to Groups" onClick={onBack} />
        </div>
      </div>

      <section className="group-editor-fields">
        <Input
          label="Name"
          editable={editable}
          placeholder="Group name"
          value={draft.name}
          onChange={value => setDraft(current => ({ ...current, name: value }))}
        />
        <Input label="By" editable={false} value={draft.createdByName || draft.createdBy} />
        <Input label="On" editable={false} value={draft.createdOn} />
      </section>

      <PersonListSelector
        className="group-editor-persons"
        singleClassName="group-editor-persons-single"
        onView={viewPerson}
        selected={{
          actions: editable ? [{
              icon: "bi bi-person-dash",
              title: "Remove from group",
              onClick: removePerson
            }] : [],
          className: "group-person-table",
          emptyText: "No persons added",
          rows: members,
          searchInputId: "group-added-person-search",
          searchPlaceholder: "Search added",
          title: "Added Persons"
        }}
        available={editable ? {
          actions: [{
                icon: "bi bi-person-plus",
                title: "Add to group",
                onClick: addPerson
              }],
          className: "group-person-table",
          emptyText: "No persons available",
          rows: availablePersons,
          searchInputId: "group-available-person-search",
          searchPlaceholder: "Search available",
          title: "Available Persons"
        } : null}
      />

      <div className="d-flex flex-wrap align-items-center justify-content-end gap-2 mt-1">
        {editable ? (
          <Button look="primary" icon={mode === "update" ? "bi bi-check2-circle" : "bi bi-plus-lg"} label={mode === "update" ? "Update Group" : "Add Group"} onClick={save} />
        ) : null}
        <Button look="dialog-close" icon="bi bi-x-circle" label="Close" onClick={onBack} />
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
    </div>
  );
}
