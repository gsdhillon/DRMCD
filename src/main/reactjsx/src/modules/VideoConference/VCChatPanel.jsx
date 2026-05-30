import { useEffect, useRef, useState } from "react";
import { useRenderDebug } from "../../app/useRenderDebug.js";
import { openVCChatSocket } from "../../services/vcChatSocket.js";
import { useApp } from "../../state/AppContext.jsx";

function dataUrl(message) {
  if (!message.fileData) {
    return "";
  }

  return "data:" + (message.fileType || "application/octet-stream") + ";base64," + message.fileData;
}

function fileLabel(message) {
  return message.fileName || "Attachment";
}

function formatKb(size) {
  const number = Number(size || 0);

  if (!Number.isFinite(number) || number <= 0) {
    return "0 KB";
  }

  return Math.ceil(number / 1024) + " KB";
}

function decodedBase64Size(value) {
  const base64 = String(value || "");

  if (!base64) {
    return 0;
  }

  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      resolve({
        fileData: result.includes(",") ? result.split(",")[1] : result,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || "application/octet-stream"
      });
    };
    reader.onerror = () => reject(reader.error || new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

async function captureScreen() {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error("Screen capture is not available in this browser.");
  }

  const stream = await navigator.mediaDevices.getDisplayMedia({
    audio: false,
    video: true
  });

  try {
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();
    await new Promise(resolve => window.setTimeout(resolve, 250));

    const track = stream.getVideoTracks()[0];
    const settings = track.getSettings();
    const canvas = document.createElement("canvas");
    canvas.width = settings.width || video.videoWidth || 1280;
    canvas.height = settings.height || video.videoHeight || 720;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL("image/png");
    const fileData = result.split(",")[1] || "";

    return {
      fileData,
      fileName: "screen-capture-" + new Date().toISOString().replace(/[:.]/g, "-") + ".png",
      fileSize: decodedBase64Size(fileData),
      fileType: "image/png"
    };
  } finally {
    stream.getTracks().forEach(track => track.stop());
  }
}

export function VCChatPanel({ conferenceId }) {
  useRenderDebug("VCChatPanel");

  const { settings, showError, user } = useApp();
  const selfPersonId = Number(user?.personId || user?.id || 0);
  const maxFileSize = Number(settings?.chatFileMaxSize || 1048576);
  const maxMessageSize = Number(settings?.chatMsgMaxSize || 500);
  const [attachedFile, setAttachedFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const fileInputRef = useRef(null);
  const listRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = openVCChatSocket(conferenceId, {
      onClose: event => {
        setConnected(false);
        if (event?.code && event.code !== 1000) {
          showError("VC chat connection closed.");
        }
      },
      onError: () => showError("Unable to connect VC chat."),
      onMessage: data => {
        if (data.type === "history") {
          setMessages(data.messages || []);
          return;
        }

        if (data.type === "message" && data.message) {
          setMessages(current => current.concat(data.message));
          return;
        }

        if (data.type === "error") {
          showError(data.message || "VC chat error.");
        }
      },
      onOpen: () => {
        setConnected(true);
      }
    });

    socketRef.current = socket;

    if (!socket) {
      showError("VC chat socket is not available.");
    }

    return () => socket?.close();
  }, [conferenceId]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  async function attachFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (file.size > maxFileSize) {
      showError("File cannot be larger than " + formatKb(maxFileSize) + ".");
      return;
    }

    try {
      setAttachedFile(await readFile(file));
    } catch (error) {
      showError(error.message || "Unable to read file.");
    }
  }

  async function attachScreenCapture() {
    try {
      setBusy(true);
      const capture = await captureScreen();

      if (capture.fileSize > maxFileSize) {
        showError("Screen capture cannot be larger than " + formatKb(maxFileSize) + ".");
        return;
      }

      setAttachedFile(capture);
    } catch (error) {
      showError(error.message || "Unable to capture screen.");
    } finally {
      setBusy(false);
    }
  }

  function sendMessage(event) {
    event.preventDefault();

    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      showError("VC chat is not connected.");
      return;
    }

    if (!text.trim() && !attachedFile?.fileData) {
      return;
    }

    if (text.trim().length > maxMessageSize) {
      showError("Message cannot be longer than " + maxMessageSize + " characters.");
      return;
    }

    if (attachedFile?.fileSize > maxFileSize) {
      showError("File cannot be larger than " + formatKb(maxFileSize) + ".");
      return;
    }

    socketRef.current.send(JSON.stringify({
      fileData: attachedFile?.fileData || "",
      fileName: attachedFile?.fileName || "",
      fileSize: attachedFile?.fileSize || 0,
      fileType: attachedFile?.fileType || "",
      message: text.trim()
    }));
    setAttachedFile(null);
    setText("");
  }

  return (
    <aside className="vc-chat-panel">
      <div className="vc-chat-header">
        <div className="d-flex align-items-center gap-2 min-w-0">
          <i className="bi bi-chat-dots-fill" aria-hidden="true" />
          <strong>Chat</strong>
        </div>
        <span className="text-secondary">{connected ? "Connected" : "Connecting"}</span>
      </div>

      <div className="vc-chat-messages" ref={listRef}>
        {messages.length === 0 ? (
          <div className="vc-chat-empty">No chat messages</div>
        ) : messages.map(message => {
          const own = Number(message.personId) === selfPersonId;
          const url = dataUrl(message);

          return (
            <div className={"vc-chat-message" + (own ? " vc-chat-message-own" : "")} key={message.id || message.createdOn}>
              <div className="vc-chat-message-meta">
                <strong>{own ? "You" : message.personName || "Person " + message.personId}</strong>
                <span>{message.createdOn ? String(message.createdOn).replace("T", " ") : ""}</span>
              </div>
              {message.message ? <p>{message.message}</p> : null}
              {url ? (
                <div className="vc-chat-file">
                  <i className="bi bi-paperclip" aria-hidden="true" />
                  <a href={url} target="_blank" rel="noreferrer">{fileLabel(message)}</a>
                  {message.fileSize ? <span className="vc-chat-file-size">{formatKb(message.fileSize)}</span> : null}
                  <a href={url} download={fileLabel(message)} title="Download">
                    <i className="bi bi-download" aria-hidden="true" />
                  </a>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {attachedFile ? (
        <div className="vc-chat-attachment">
          <i className="bi bi-paperclip" aria-hidden="true" />
          <span>{attachedFile.fileName}</span>
          <small className="text-secondary">{formatKb(attachedFile.fileSize)}</small>
          <button type="button" className="btn btn-sm btn-outline-secondary" title="Remove attachment" onClick={() => setAttachedFile(null)}>
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <form className="vc-chat-form" onSubmit={sendMessage}>
        <input ref={fileInputRef} hidden type="file" onChange={attachFile} />
        <textarea
          className="form-control"
          placeholder="Type message"
          rows={2}
          maxLength={maxMessageSize}
          value={text}
          onChange={event => setText(event.target.value)}
        />
        <div className="vc-chat-actions">
          <button type="button" className="btn btn-outline-secondary" title="Attach document" onClick={() => fileInputRef.current?.click()}>
            <i className="bi bi-paperclip" aria-hidden="true" />
          </button>
          <button type="button" className="btn btn-outline-secondary" disabled={busy} title="Capture screen" onClick={attachScreenCapture}>
            <i className="bi bi-camera" aria-hidden="true" />
          </button>
          <button type="submit" className="btn btn-primary" disabled={!connected}>
            <i className="bi bi-send" aria-hidden="true" />
          </button>
        </div>
      </form>
    </aside>
  );
}
