import { useState } from "react";
import { Form } from "../../common/form/Form.jsx";
import { FormDialog } from "../../common/form/FormDialog.jsx";
import { Input } from "../../common/form/Input.jsx";
import { useRenderDebug } from "../../common/useRenderDebug.js";

const emptyRole = {
  id: "",
  name: "",
  color: "F4F4F4"
};

function normalizeColor(color) {
  return String(color || "").replace(/^#/, "").toUpperCase();
}

function roleDraft(role) {
  return role
    ? { ...emptyRole, ...role, color: normalizeColor(role.color) }
    : { ...emptyRole };
}

export function RoleDialog({ onClose, onSave, role }) {
  useRenderDebug("RoleDialog");

  const [draft, setDraft] = useState(() => roleDraft(role));
  const editing = Boolean(role?.id);

  function change(field, value) {
    setDraft(current => ({ ...current, [field]: value }));
  }

  function submit() {
    return onSave({
      id: draft.id || null,
      name: draft.name.trim(),
      color: normalizeColor(draft.color)
    });
  }

  return (
    <FormDialog onClose={onClose}>
      <Form
        className="role-editor"
        onSubmit={submit}
        submitIcon={editing ? "check2-circle" : "plus-lg"}
        submitLabel={editing ? "Update Role" : "Add Role"}
        title={editing ? "Update Role" : "Add Role"}
      >
        <Input label="Id" editable={false} value={draft.id} />
        <Input label="Role" value={draft.name} onChange={value => change("name", value)} />
        <Input
          label="Color"
          className="form-control form-control-color"
          type="color"
          value={"#" + normalizeColor(draft.color)}
          onChange={value => change("color", normalizeColor(value))}
        />
      </Form>
    </FormDialog>
  );
}
