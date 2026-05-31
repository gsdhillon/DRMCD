import { useEffect, useState } from "react";
import { valueOrEmpty } from "../../app/Helpers.js";
import { useRenderDebug } from "../../app/useRenderDebug.js";
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
  const [closing, setClosing] = useState("");
  const [draft, setDraft] = useState(() => dialogDraft(settings));

  useEffect(() => {
    if (!closing) {
      setDraft(dialogDraft(settings));
    }
  }, [settings]);

  function animateClose(animation) {
    if (closing) {
      return;
    }

    setClosing(animation);
    window.setTimeout(
      onClose,
      animation === "submit" ? 440 : 360
    );
  }

  function close(event) {
    event?.preventDefault();
    event?.stopPropagation();

    if (busy) {
      return;
    }

    animateClose("throw");
  }

  function change(field, value) {
    setDraft(current => ({
      ...current,
      [field]: value
    }));
  }

  function numberField(field, label, fallback, suffix = "") {
    return (
      <label className="form-row">
        <span>{label}</span>
        <div className={suffix ? "input-group" : undefined}>
          <input
            className="form-control"
            type="number"
            value={valueOrEmpty(numberValue(draft[field], fallback))}
            onChange={event => change(field, event.target.value)}
          />
          {suffix ? <span className="input-group-text">{suffix}</span> : null}
        </div>
      </label>
    );
  }

  function devModeField(field, label, helpText) {
    const enabled = draft[field] === true;

    return (
      <label className="form-row">
        <span>{label}</span>
        <div className="app-settings-inline-control">
          <input
            className="form-check-input"
            checked={enabled}
            type="checkbox"
            onChange={event => change(field, event.target.checked)}
          />
          <strong className={enabled ? "text-success" : "text-secondary"}>{enabled ? "ON" : "OFF"}</strong>
          <button type="button" className="btn btn-sm btn-link app-settings-info-button" title="Info" onClick={() => showInfo(helpText)}>
            <i className="bi bi-info-circle" aria-hidden="true" />
          </button>
        </div>
      </label>
    );
  }

  async function save(event) {
    event.preventDefault();
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
      animateClose("submit");
    } catch (saveError) {
      showError(saveError.message || "Unable to save app settings");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={"modal-backdrop-custom" + (closing ? " modal-closing-" + closing : "")} onClick={close}>
      <form className={"modal-panel app-settings-panel" + (closing ? " modal-closing-" + closing : "")} onClick={event => event.stopPropagation()} onSubmit={save}>
        <div className="modal-header px-0 pt-0">
          <h2 className="modal-title fs-4">
            <i className="bi bi-gear-fill me-2" aria-hidden="true" />
            App Settings
          </h2>
        </div>

        <div className="app-settings-scroll">
          <label className="form-row">
            <span>App Version:</span>
            <input className="form-control" disabled value={valueOrEmpty(draft.appVersion)} />
          </label>
          <label className="form-row">
            <span>Started On:</span>
            <input className="form-control" disabled value={valueOrEmpty(draft.startedOn)} />
          </label>
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

        <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            <i className="bi bi-check2-circle me-2" aria-hidden="true" />
            {busy ? "Saving" : "Save Settings"}
          </button>
          <button type="button" className="btn btn-secondary dialog-close-button" disabled={busy} onClick={close}>
            <i className="bi bi-x-circle me-2" aria-hidden="true" />
            Close
          </button>
        </div>
      </form>
    </div>
  );
}
