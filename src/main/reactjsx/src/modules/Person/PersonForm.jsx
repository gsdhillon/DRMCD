import { useEffect, useState } from "react";
import { Form } from "../../common/form/Form.jsx";
import { FormDialog } from "../../common/form/FormDialog.jsx";
import { Input } from "../../common/form/Input.jsx";
import { Select } from "../../common/form/Select.jsx";
import { Photo } from "../../common/Photo.jsx";
import { useRenderDebug } from "../../common/useRenderDebug.js";
import { useApp } from "../../state/AppContext.jsx";

const EMPTY_PERSON = {
  name: "",
  email: "",
  mobileNo: "",
  designation: "",
  photo: null,
  role: "",
  roleId: null,
  password: ""
};

// Builds a safe editable copy; role selection is resolved by the Select options.
function createDraft(person) {
  return person ? { ...EMPTY_PERSON, ...person } : { ...EMPTY_PERSON };
}

export function PersonForm({
  editable = true,
  mode = "add",
  onClose,
  onSave,
  person,
  roles = []
}) {
  useRenderDebug("PersonForm");

  const { showError } = useApp();
  const roleOptions = roles;
  // Lazy initializer: create the draft once when the form opens.
  const [draft, setDraft] = useState(() => createDraft(person));

  const title = mode === "view" ? "Person Details" : mode === "update" ? "Update Person" : "Add New Person";
  const submitLabel = mode === "update" ? "Update Person" : "Add Person";
  const submitIcon = mode === "update" ? "bi bi-check2-circle" : "bi bi-plus-lg";

  useEffect(() => {
    setDraft(createDraft(person));
  }, [person]);

  function change(field, value) {
    // Functional update: React passes the latest draft as current.
    setDraft(current => ({ ...current, [field]: value }));
  }

  function submit() {
    if (!roleOptions.some(role => role.id === Number(draft.roleId))) {
      showError("Please choose a role.");
      return false;
    }

    return onSave?.({
      ...draft,
      password: draft.password || null
    });
  }

  function changeRole(roleId, role) {
    if (!role) {
      change("roleId", null);
      change("role", "");
      return;
    }

    change("roleId", Number(roleId));
    change("role", role.name);
  }

  return (
    <FormDialog onClose={onClose}>
      <Form
        className="person-form"
        editable={editable}
        onSubmit={submit}
        side={<Photo editable={editable} photo={draft.photo || draft.thumbnail} onChange={photo => change("photo", photo)} />}
        submitIcon={submitIcon}
        submitLabel={submitLabel}
        title={title}
      >
        <Input
          label="Name"
          editable={editable}
          value={draft.name}
          onChange={value => change("name", value)}
        />
        <Input
          label="Email"
          editable={editable}
          value={draft.email}
          onChange={value => change("email", value)}
        />
        <Input
          label="Mobile No"
          editable={editable}
          value={draft.mobileNo}
          onChange={value => change("mobileNo", value)}
        />
        <Input
          label="Designation"
          editable={editable}
          value={draft.designation}
          onChange={value => change("designation", value)}
        />
        <Select
          editable={editable}
          label="Role"
          options={roleOptions}
          value={draft.roleId}
          onChange={changeRole}
        />
        {editable ? (
          <Input
            label="Password"
            editable={editable}
            placeholder={mode === "update" ? "Leave blank to keep existing" : "Password"}
            type="password"
            value={draft.password}
            onChange={value => change("password", value)}
          />
        ) : null}
      </Form>
    </FormDialog>
  );
}
