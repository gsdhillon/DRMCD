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
          <Input
            label="Started On:"
            editable={false}
            value={draft.startedOn}
          />
          <CheckBox
            label="Client Dev Mode:"
            editable={!busy}
            infoMsg="It will set the client console logs to debug mode"
            value={draft.clientInDevMode === true}
            onChange={value => change("clientInDevMode", value)}
          />
          <CheckBox
            label="Server Dev Mode:"
            editable={!busy}
            infoMsg="It will set the server console logs to debug mode"
            value={draft.serverInDevMode === true}
            onChange={value => change("serverInDevMode", value)}
          />
          <Input
            label="Chat Msg Buffer Size:"
            editable={!busy}
            type="number"
            value={numberValue(draft.chatMsgBufferSize, defaults.chatMsgBufferSize)}
            onChange={value => change("chatMsgBufferSize", value)}
          />
          <Input
            label="Chat Msg Max Size:"
            editable={!busy}
            type="number"
            value={numberValue(draft.chatMsgMaxSize, defaults.chatMsgMaxSize)}
            onChange={value => change("chatMsgMaxSize", value)}
          />
          <Input
            label="Chat File Max Size:"
            editable={!busy}
            suffix="KB"
            type="number"
            value={numberValue(draft.chatFileMaxSizeKb, bytesToKb(defaults.chatFileMaxSize, defaults.chatFileMaxSize))}
            onChange={value => change("chatFileMaxSizeKb", value)}
          />
          <Input
            label="Vc Early Start Mins:"
            editable={!busy}
            type="number"
            value={numberValue(draft.vcEarlyStartMins, defaults.vcEarlyStartMins)}
            onChange={value => change("vcEarlyStartMins", value)}
          />
          <Input
            label="Vc Past Mins:"
            editable={!busy}
            type="number"
            value={numberValue(draft.vcPastMins, defaults.vcPastMins)}
            onChange={value => change("vcPastMins", value)}
          />
          <Input
            label="Popup Msg Time:"
            editable={!busy}
            suffix="secs"
            type="number"
            value={numberValue(draft.popupMsgTime, defaults.popupMsgTime)}
            onChange={value => change("popupMsgTime", value)}
          />
          <Input
            label="Vc Max Duration:"
            editable={!busy}
            suffix="minutes"
            type="number"
            value={numberValue(draft.vcMaxDuration, defaults.vcMaxDuration)}
            onChange={value => change("vcMaxDuration", value)}
          />
          <Input
            label="Vc Exteded Time:"
            editable={!busy}
            suffix="minutes"
            type="number"
            value={numberValue(draft.vcExtededTime, defaults.vcExtededTime)}
            onChange={value => change("vcExtededTime", value)}
          />
          <Input
            label="Vc End Alert Intrval:"
            editable={!busy}
            suffix="minutes"
            type="number"
            value={numberValue(draft.vcEndAlertIntrval, defaults.vcEndAlertIntrval)}
            onChange={value => change("vcEndAlertIntrval", value)}
          />
        </div>
      </Form>
    </FormDialog>
  );
}
