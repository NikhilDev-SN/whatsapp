const state = {
  statusTimer: null,
  groupName: "SSR attendence Group",
  lastToastAt: 0
};

const els = {
  groupName: document.querySelector("#groupName"),
  connectionState: document.querySelector("#connectionState"),
  qrPanel: document.querySelector("#qrPanel"),
  qrSpinner: document.querySelector("#qrSpinner"),
  qrImage: document.querySelector("#qrImage"),
  qrTitle: document.querySelector("#qrTitle"),
  qrHint: document.querySelector("#qrHint"),
  refreshQrButton: document.querySelector("#refreshQrButton"),
  composerPanel: document.querySelector("#composerPanel"),
  messageForm: document.querySelector("#messageForm"),
  message: document.querySelector("#message"),
  sendButton: document.querySelector("#sendButton"),
  sentBubble: document.querySelector("#sentBubble"),
  toast: document.querySelector("#toast")
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
  const data = await response.json().catch(() => ({ ok: false, error: "Invalid response." }));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function setView(view) {
  els.qrPanel.hidden = view !== "qr";
  els.composerPanel.hidden = view !== "composer";
}

function toast(message, type = "info") {
  els.toast.textContent = message;
  els.toast.classList.toggle("error", type === "error");
  els.toast.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    els.toast.hidden = true;
  }, 2500);
}

function showWaiting(title = "Waiting for QR", hint = "Keep this page open.") {
  els.qrTitle.textContent = title;
  els.qrHint.textContent = hint;
  els.qrImage.hidden = true;
  els.qrImage.removeAttribute("src");
  els.qrSpinner.hidden = false;
  setView("qr");
}

function renderStatus(status) {
  if (status.ready) {
    els.connectionState.textContent = "Ready";
    setView("composer");
    return;
  }

  if (status.qrDataUrl) {
    els.connectionState.textContent = "Scan QR";
    els.qrTitle.textContent = "Scan QR";
    els.qrHint.textContent = "WhatsApp > Linked devices > Link a device";
    els.qrImage.src = status.qrDataUrl;
    els.qrImage.hidden = false;
    els.qrSpinner.hidden = true;
    setView("qr");
    return;
  }

  els.connectionState.textContent = status.lastError || "Connecting";
  showWaiting(
    status.lastError ? "Refresh QR" : "Waiting for QR",
    status.lastError || "WhatsApp is starting."
  );
}

async function refreshStatus() {
  try {
    const status = await api("/api/status", { method: "GET", headers: {} });
    renderStatus(status);
    return status;
  } catch {
    els.connectionState.textContent = "Reconnecting";
    showWaiting("Reconnecting", "Render or WhatsApp is waking up.");
    if (Date.now() - state.lastToastAt > 30000) {
      state.lastToastAt = Date.now();
      toast("Reconnecting. Keep this page open.", "error");
    }
    return null;
  }
}

function nextPollDelay(status) {
  if (!status) return 8000;
  if (status.ready) return 60000;
  if (status.qrDataUrl) return 10000;
  return 6000;
}

function startStatusLoop(delay = 0) {
  clearTimeout(state.statusTimer);
  state.statusTimer = setTimeout(async () => {
    const status = await refreshStatus();
    startStatusLoop(nextPollDelay(status));
  }, delay);
}

els.refreshQrButton.addEventListener("click", async () => {
  els.refreshQrButton.disabled = true;
  els.connectionState.textContent = "Refreshing QR";
  showWaiting("Refreshing QR", "Wait for the new code before scanning.");

  try {
    await api("/api/whatsapp/restart", { method: "POST", body: "{}" });
    const status = await refreshStatus();
    startStatusLoop(nextPollDelay(status));
  } catch (error) {
    toast(error.message, "error");
  } finally {
    els.refreshQrButton.disabled = false;
  }
});

els.messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = els.message.value.trim();
  if (!message) return;

  els.sendButton.disabled = true;
  try {
    await api("/api/messages", {
      method: "POST",
      body: JSON.stringify({ message })
    });
    els.sentBubble.hidden = false;
    els.sentBubble.textContent = message;
    els.message.value = "";
    toast("Sent");
  } catch (error) {
    toast(error.message, "error");
  } finally {
    els.sendButton.disabled = false;
    els.message.focus();
  }
});

const config = await api("/api/config", { method: "GET", headers: {} }).catch(() => null);
state.groupName = config?.groupName || state.groupName;
els.groupName.textContent = state.groupName;

showWaiting();
startStatusLoop();
