export const noBrowserSaveFormProps = {
  autoComplete: "off",
  "data-1p-ignore": "true",
  "data-bwignore": "true",
  "data-form-type": "other",
  "data-lpignore": "true"
};

function unlockInput(inputEvent) {
  inputEvent.currentTarget.readOnly = false;
}

export function noAutofillInputProps(props, editable = true) {
  return {
    ...props,
    autoComplete: "new-password",
    onClick: unlockInput,
    onFocus: unlockInput,
    readOnly: editable,
    spellCheck: false
  };
}

export function BrowserBlocker() {
  return (
    <>
      <input autoComplete="username" aria-hidden="true" name="username" readOnly className="hidden-autofill-field" tabIndex={-1} type="text" />
      <input autoComplete="current-password" aria-hidden="true" name="password" readOnly className="hidden-autofill-field" tabIndex={-1} type="password" />
    </>
  );
}
