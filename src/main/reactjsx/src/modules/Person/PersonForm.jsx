import { useEffect, useState } from "react";
import { Form } from "../../common/Form.jsx";
import { FormInput } from "../../common/FormInput.jsx";
import { FormSelect } from "../../common/FormSelect.jsx";
import { Photo } from "../../common/Photo.jsx";
import { useRenderDebug } from "../../common/useRenderDebug.js";

const EMPTY_PERSON = {
  name: "",
  email: "",
  mobileNo: "",
  designation: "",
  photo: null,
  role: "User",
  password: ""
};

export function createEmptyPerson() {
  return { ...EMPTY_PERSON };
}

export function PersonForm({
  isPrivileged = false,
  editable = true,
  mode = "add",
  onClose,
  onSave,
  person,
  roles = []
}) {
  useRenderDebug("PersonForm");

  const roleOptions = roles;
  const [draft, setDraft] = useState(() => ({ ...EMPTY_PERSON, ...(person || {}) }));
  const editableRoleOptions = roleOptions.filter(role => isPrivileged || role.role === "User");
  const title = mode === "view" ? "Person Details" : mode === "update" ? "Update Person" : "Add New Person";
  const submitLabel = mode === "update" ? "Update Person" : "Add Person";
  const submitIcon = mode === "update" ? "bi bi-check2-circle" : "bi bi-plus-lg";

  useEffect(() => {
    setDraft({ ...EMPTY_PERSON, ...(person || {}) });
  }, [person]);

  function change(field, value) {
    setDraft(current => ({ ...current, [field]: value }));
  }

  function submit() {
    return onSave?.({
      ...draft,
      designation: draft.designation || null,
      photo: draft.photo || null,
      role: draft.role || "User",
      roleId: draft.roleId || roleOptions.find(role => role.role === (draft.role || "User"))?.id || null,
      password: draft.password || null
    });
  }

  function changeRole(roleId) {
    const role = roleOptions.find(candidate => String(candidate.id || "") === roleId);
    change("roleId", role?.id || null);
    change("role", role?.role || "User");
  }

  return (
    <Form
      className="person-form"
      editable={editable}
      onClose={onClose}
      onSubmit={submit}
      side={<Photo editable={editable} photo={draft.photo || draft.thumbnail} onChange={photo => change("photo", photo)} />}
      submitIcon={submitIcon}
      submitLabel={submitLabel}
      title={title}
    >
      <FormInput
        label="Name"
        editable={editable}
        value={draft.name}
        onChange={value => change("name", value)}
      />
      <FormInput
        label="Email"
        editable={editable}
        value={draft.email}
        onChange={value => change("email", value)}
      />
      <FormInput
        label="Mobile No"
        editable={editable}
        value={draft.mobileNo}
        onChange={value => change("mobileNo", value)}
      />
      <FormInput
        label="Designation"
        editable={editable}
        value={draft.designation}
        onChange={value => change("designation", value)}
      />
      <FormSelect
        editable={editable}
        label="Role"
        value={draft.roleId || roleOptions.find(role => role.role === (draft.role || "User"))?.id || ""}
        onChange={changeRole}
      >
        {editableRoleOptions.map(role => (
          <option key={String(role.id ?? role.role)} value={role.id || ""}>{role.role}</option>
        ))}
      </FormSelect>
      {editable ? (
        <FormInput
          label="Password"
          editable={editable}
          placeholder={mode === "update" ? "Leave blank to keep existing" : "Password"}
          type="password"
          value={draft.password}
          onChange={value => change("password", value)}
        />
      ) : null}
    </Form>
  );
}
