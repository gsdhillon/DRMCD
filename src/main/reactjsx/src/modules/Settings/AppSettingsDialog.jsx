import { useEffect, useState } from "react";
import { CheckBox } from "../../common/form/CheckBox.jsx";
import { Form } from "../../common/form/Form.jsx";
import { FormDialog } from "../../common/form/FormDialog.jsx";
import { Input } from "../../common/form/Input.jsx";
import { useRenderDebug } from "../../common/useRenderDebug.js";
import { updateSettings } from "../../services/settingsService.js";
import { useApp } from "../../state/AppContext.jsx";

const defaults = {
  chatFileMaxSize: 1048576,
  chatMsgBufferSize: 50,
  chatMsgMaxSize: 500,
  popupMsgTime: 3,
  vcEarlyStartMins: 5,
  vcEndAlertIntrval: 5,
  vcExtededTime: 10,
  vcMaxDuration: 240,
  vcPastMins: 5
};

function numberValue(value, fallback) {
  return value === "" ? "" : value ?? fallback;
}

function positiveNumberOrDefault(value, fallback) {
  const number = Number(value);

  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function nonNegativeNumberOrDefault(value, fallback) {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function bytesToKb(value, fallback) {
  const number = Number(value ?? fallback);

  if (!Number.isFinite(number) || number < 1) {
    return Math.ceil(fallback / 1024);
  }

  return Math.ceil(number / 1024);
}

function kbToBytes(value, fallback) {
  return positiveNumberOrDefault(value, bytesToKb(fallback, fallback)) * 1024;
}

function dialogDraft(settings) {
  return {
    ...defaults,
    ...(settings || {}),
    chatFileMaxSizeKb: bytesToKb(settings?.chatFileMaxSize, defaults.chatFileMaxSize)
  };
}

export function AppSettingsDialog({ onClose }) {
  useRenderDebug("AppSettingsDialog");

  const { refreshSettings, settings, showError, showInfo } = useApp();
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(() => dialogDraft(settings));

  useEffect(() => {
    setDraft(dialogDraft(settings));
  }, [settings]);

  function change(field, value) {
    setDraft(current => ({
      ...current,
      [field]: value
    }));
  }

  function numberField(field, label, fallback, suffix = "") {
    return (
      <Input
        label={label}
        editable={!busy}
        suffix={suffix}
        type="number"
        value={numberValue(draft[field], fallback)}
        onChange={value => change(field, value)}
      />
    );
  }

  function devModeField(field, label, helpText) {
    return (
      <CheckBox
        label={label}
        editable={!busy}
        infoMsg={helpText}
        value={draft[field] === true}
        onChange={value => change(field, value)}
      />
    );
  }

  async function save() {
    setBusy(true);

    try {
      const { chatFileMaxSizeKb, ...settingsDraft } = draft;
      const saved = await updateSettings({
        ...settingsDraft,
        chatFileMaxSize: kbToBytes(chatFileMaxSizeKb, defaults.chatFileMaxSize),
        chatMsgBufferSize: positiveNumberOrDefault(draft.chatMsgBufferSize, defaults.chatMsgBufferSize),
        chatMsgMaxSize: positiveNumberOrDefault(draft.chatMsgMaxSize, defaults.chatMsgMaxSize),
        clientInDevMode: draft.clientInDevMode === true,
        popupMsgTime: positiveNumberOrDefault(draft.popupMsgTime, defaults.popupMsgTime),
        serverInDevMode: draft.serverInDevMode === true,
        vcEarlyStartMins: nonNegativeNumberOrDefault(draft.vcEarlyStartMins, defaults.vcEarlyStartMins),
        vcEndAlertIntrval: positiveNumberOrDefault(draft.vcEndAlertIntrval, defaults.vcEndAlertIntrval),
        vcExtededTime: nonNegativeNumberOrDefault(draft.vcExtededTime, defaults.vcExtededTime),
        vcMaxDuration: positiveNumberOrDefault(draft.vcMaxDuration, defaults.vcMaxDuration),
        vcPastMins: nonNegativeNumberOrDefault(draft.vcPastMins, defaults.vcPastMins)
      });

      setDraft(dialogDraft(saved || {}));
      await refreshSettings();
      showInfo("Settings saved");
      return true;
    } catch (saveError) {
      showError(saveError.message || "Unable to save app settings");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormDialog busy={busy} onClose={onClose}>
      <Form
        busy={busy}
        className="app-settings-panel"
        onSubmit={save}
        submitLabel={busy ? "Saving" : "Save Settings"}
        title={<><i className="bi bi-gear-fill me-2" aria-hidden="true" />App Settings</>}
      >
        <div className="app-settings-scroll">
          <Input
              label="App Version:"
              editable={false}
              value={draft.appVersion}
          />
          <Input label="Started On:" editable={false} value={draft.startedOn} />
          {devModeField("clientInDevMode", "Client Dev Mode:", "It will set the client console logs to debug mode")}
          {devModeField("serverInDevMode", "Server Dev Mode:", "It will set the server console logs to debug mode")}
          {numberField("chatMsgBufferSize", "Chat Msg Buffer Size:", defaults.chatMsgBufferSize)}
          {numberField("chatMsgMaxSize", "Chat Msg Max Size:", defaults.chatMsgMaxSize)}
          {numberField("chatFileMaxSizeKb", "Chat File Max Size:", bytesToKb(defaults.chatFileMaxSize, defaults.chatFileMaxSize), "KB")}
          {numberField("vcEarlyStartMins", "Vc Early Start Mins:", defaults.vcEarlyStartMins)}
          {numberField("vcPastMins", "Vc Past Mins:", defaults.vcPastMins)}
          {numberField("popupMsgTime", "Popup Msg Time:", defaults.popupMsgTime, "secs")}
          {numberField("vcMaxDuration", "Vc Max Duration:", defaults.vcMaxDuration, "minutes")}
          {numberField("vcExtededTime", "Vc Exteded Time:", defaults.vcExtededTime, "minutes")}
          {numberField("vcEndAlertIntrval", "Vc End Alert Intrval:", defaults.vcEndAlertIntrval, "minutes")}
        </div>
      </Form>
    </FormDialog>
  );
}
