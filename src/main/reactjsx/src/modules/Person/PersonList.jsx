import { useEffect, useState } from "react";
import { useRenderDebug } from "../../common/useRenderDebug.js";
import { createPerson, deletePerson, getPerson, getPersons, updatePerson } from "../../services/personService.js";
import { getRoles } from "../../services/roleService.js";
import { useApp } from "../../state/AppContext.jsx";
import { PersonForm } from "./PersonForm.jsx";
import { PersonTable } from "./PersonTable.jsx";

export function PersonList({ backTitle = "Back", groupId, onBack, persons: providedPersons, title = "Persons" }) {
  useRenderDebug("PersonList");

  const { auth, showError } = useApp();

  const [persons, setPersons] = useState([]);
  const [roles, setRoles] = useState([]);
  const [personDialog, setPersonDialog] = useState(null);

  const isAdmin = auth?.role === "Admin" || auth?.role === "SuperAdmin";
  const isSuperAdmin = auth?.role === "SuperAdmin";
  const readOnlyList = Boolean(groupId) || Array.isArray(providedPersons);

  async function loadPersons() {
    if (Array.isArray(providedPersons)) {
      setPersons(providedPersons);
      return;
    }

    try {
      setPersons(await getPersons(groupId));
    } catch (error) {
      showError(error.message || "Unable to load persons");
      setPersons([]);
    }
  }

  async function loadRoles() {
    try {
      setRoles(await getRoles());
    } catch (error) {
      setRoles([]);
    }
  }

  useEffect(() => {
    loadPersons();
    loadRoles();
  }, [groupId, providedPersons]);

  useEffect(() => {
    if (personDialog && roles.length === 0) {
      showError("At least one role is required to open person form.");
      setPersonDialog(null);
    }
  }, [personDialog, roles]);

  function openNewPerson() {
    if (roles.length === 0) {
      showError("At least one role is required to add a person.");
      return;
    }

    setPersonDialog({
      mode: "add",
      person: null
    });
  }

  async function openUpdatePerson(person) {
    if (roles.length === 0) {
      showError("At least one role is required to update a person.");
      return;
    }

    try {
      setPersonDialog({
        mode: "update",
        person: { ...(await getPerson(person.id)), password: "" }
      });
    } catch (error) {
      setPersonDialog({
        mode: "update",
        person: { ...person, password: "" }
      });
    }
  }

  async function viewPerson(person) {
    if (roles.length === 0) {
      showError("At least one role is required to view person details.");
      return;
    }

    try {
      setPersonDialog({
        mode: "view",
        person: await getPerson(person.id)
      });
    } catch (error) {
      setPersonDialog({
        mode: "view",
        person
      });
    }
  }

  async function savePerson(person) {
    try {
      if (personDialog?.mode === "update") {
        await updatePerson(person);
      } else {
        await createPerson(person);
      }

      await loadPersons();
      return true;
    } catch (error) {
      showError(error.message || "Unable to save person");
      return false;
    }
  }

  function closePersonDialog() {
    setPersonDialog(null);
  }

  async function removePerson(id) {
    try {
      await deletePerson(id);
      await loadPersons();
    } catch (error) {
      showError(error.message || "Unable to delete person");
    }
  }

  function canManagePerson(person) {
    return isSuperAdmin || (auth?.role === "Admin" && person.role !== "Admin" && person.role !== "SuperAdmin");
  }

  const actions = [
    {
      className: "btn btn-sm btn-outline-secondary me-1",
      icon: "bi bi-pencil-square",
      title: "Update",
      show: person => isAdmin && canManagePerson(person) && !readOnlyList,
      onClick: openUpdatePerson
    },
    {
      className: "btn btn-sm btn-outline-danger",
      icon: "bi bi-trash",
      title: "Delete",
      show: person => isAdmin && canManagePerson(person) && !readOnlyList,
      onClick: person => removePerson(person.id)
    }
  ];

  return (
    <div className="view-fill">
      <PersonTable
        onAdd={isAdmin && !readOnlyList ? openNewPerson : null}
        onView={viewPerson}
        rows={persons}
        searchFields={["name"]}
        searchInputId={groupId ? "group-person-search-" + groupId : "person-search"}
        title={title}
        toolbarActions={onBack ? (
          <button type="button" className="btn btn-outline-secondary table-add-button table-nav-button" title={backTitle} aria-label={backTitle} onClick={onBack}>
            <i className="bi bi-arrow-left" aria-hidden="true" />
          </button>
        ) : null}
        actions={actions}
      />

      {personDialog && roles.length > 0 ? (
        <PersonForm
          editable={personDialog.mode !== "view"}
          mode={personDialog.mode}
          person={personDialog.person}
          roles={roles}
          onClose={closePersonDialog}
          onSave={savePerson}
        />
      ) : null}
    </div>
  );
}
