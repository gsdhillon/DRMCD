import { DataForm } from "../../common/DataForm.jsx";
import { Photo } from "../../common/Photo.jsx";
import { useRenderDebug } from "../../app/useRenderDebug.js";

const EMPTY_PERSON = {
  name: "",
  email: "",
  mobileNo: "",
  designation: "",
  photo: null,
  role: "User",
  password: ""
};

function emptyPerson() {
  return { ...EMPTY_PERSON };
}

export function createEmptyPerson() {
  return emptyPerson();
}

export function PersonForm({
  allowPrivilegedRoles = false,
  editable = true,
  error,
  mode = "add",
  onClearError,
  onClose,
  onSave,
  person,
  roles = []
}) {
  useRenderDebug("PersonForm");

  const roleOptions = roles.length
    ? roles
    : [
        { id: null, role: "User" },
        { id: null, role: "Admin" },
        { id: null, role: "SuperAdmin" }
      ];

  return (
    <DataForm
      editable={editable}
      emptyValue={EMPTY_PERSON}
      error={error}
      fields={[
        { label: "Name", minLength: 2, name: "name", inputName: "personEditorName", required: true },
        { label: "Email", name: "email", inputName: "personEditorEmail" },
        { label: "Mobile No", name: "mobileNo", inputName: "personEditorMobileNo" },
        {
          autoComplete: "new-password",
          inputName: "personMetaField",
          label: "Designation",
          name: "designation",
          spellCheck: false,
          unlockAutofill: true
        },
        {
          getOptionLabel: role => role.role,
          getOptionValue: role => role.id || "",
          label: "Role",
          name: "roleId",
          options: roleOptions.filter(role => allowPrivilegedRoles || role.role === "User"),
          type: "select",
          value: draft => draft.roleId || roleOptions.find(role => role.role === (draft.role || "User"))?.id || "",
          onChange: (value, draft, change) => {
            const role = roleOptions.find(candidate => String(candidate.id || "") === value);

            change("roleId", role?.id || null);
            change("role", role?.role || "User");
          }
        },
        {
          autoComplete: "new-password",
          hiddenWhenView: true,
          inputName: "personPrivateField",
          label: "Password",
          name: "password",
          placeholder: mode === "update" ? "Leave blank to keep existing" : "Password",
          spellCheck: false,
          style: { WebkitTextSecurity: "disc" },
          type: "password",
          unlockAutofill: true
        }
      ]}
      formClassName="person-form"
      initialValue={person}
      mode={mode}
      submitLabel={mode === "update" ? "Update Person" : "Add Person"}
      title={mode === "view" ? "Person Details" : mode === "update" ? "Update Person" : "Add New Person"}
      onClearError={onClearError}
      onClose={onClose}
      onSave={draft => onSave?.({
        ...draft,
        designation: draft.designation || null,
        photo: draft.photo || null,
        role: draft.role || "User",
        roleId: draft.roleId || roleOptions.find(role => role.role === (draft.role || "User"))?.id || null,
        password: draft.password || null
      })}
      sideContent={({ change, draft }) => (
        <Photo editable={editable} photo={draft.photo || draft.thumbnail} onChange={photo => change("photo", photo)} />
      )}
    />
  );
}
