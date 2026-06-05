const state = {
  authenticated: false,
  statusTimer: null,
  groupName: "SSR attendence Group",
  activeView: "login",
  lastStatus: null,
  lastTransientToastAt: 0
};

const els = {
  groupName: document.querySelector("#groupName"),
  connectionState: document.querySelector("#connectionState"),
  loginPanel: document.querySelector("#loginPanel"),
  loginForm: document.querySelector("#loginForm"),
  passcode: document.querySelector("#passcode"),
  logoutButton: document.querySelector("#logoutButton"),
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
  emptyState: document.querySelector("#emptyState"),
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
  if (!response.ok) {
    const error = new Error(data.error || "Request failed.");
    error.status = response.status;
    throw error;
  }

  return data;
}

function setView(view) {
  state.activeView = view;
  els.loginPanel.hidden = view !== "login";
  els.qrPanel.hidden = view !== "qr";
  els.composerPanel.hidden = view !== "composer";
  els.logoutButton.hidden = view === "login";
}

function toast(message, type = "info") {
  els.toast.textContent = message;
  els.toast.classList.toggle("error", type === "error");
  els.toast.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    els.toast.hidden = true;
  }, 2800);
}

function renderStatus(status) {
  state.lastStatus = status;

  if (status.ready) {
    els.connectionState.textContent = "Ready";
    setView("composer");
    return;
  }

  if (status.qrDataUrl) {
    els.connectionState.textContent = "Scan to connect";
    els.qrTitle.textContent = "Scan QR to connect";
    els.qrHint.textContent = status.lastQrAt
      ? "Scan the newest code from WhatsApp > Linked devices > Link a device"
      : "WhatsApp > Linked devices > Link a device";
    els.qrImage.src = status.qrDataUrl;
    els.qrImage.hidden = false;
    els.qrSpinner.hidden = true;
    setView("qr");
    return;
  }

  els.connectionState.textContent = status.lastError || "Connecting";
  els.qrTitle.textContent = status.lastError ? "Connection needs attention" : "Waiting for QR";
  els.qrHint.textContent = status.lastError
    ? `${status.lastError}. Refresh the QR and scan the new code.`
    : "Keep this page open while WhatsApp prepares the QR code.";
  els.qrImage.hidden = true;
  els.qrImage.removeAttribute("src");
  els.qrSpinner.hidden = false;
  setView("qr");
}

async function loadConfig() {
  const data = await api("/api/config", { method: "GET", headers: {} });
  state.groupName = data.groupName || state.groupName;
  els.groupName.textContent = state.groupName;
}

async function refreshStatus() {
  try {
    const status = await api("/api/status", { method: "GET", headers: {} });
    state.authenticated = true;
    renderStatus(status);
    return status;
  } catch (error) {
    if (error.status !== 401) {
      els.connectionState.textContent = "Reconnecting";
      if (state.activeView === "login" && state.authenticated) {
        setView("qr");
      }
      const now = Date.now();
      if (now - state.lastTransientToastAt > 30000) {
        state.lastTransientToastAt = now;
        toast("Connection is waking up. Keep this page open.", "error");
      }
      return null;
    }

    state.authenticated = false;
    els.connectionState.textContent = "Locked";
    setView("login");
    return null;
  }
}

function nextPollDelay(status) {
  if (!state.authenticated) return 0;
  if (!status) return 8000;
  if (status.ready) return 60000;
  if (status.qrDataUrl) return 10000;
  return 6000;
}

function startStatusLoop(initialDelay = 0) {
  clearTimeout(state.statusTimer);

  state.statusTimer = setTimeout(async () => {
    const status = await refreshStatus();
    const delay = nextPollDelay(status);
    if (delay > 0) startStatusLoop(delay);
  }, initialDelay);
}

els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = els.loginForm.querySelector("button");
  button.disabled = true;

  try {
    await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ passcode: els.passcode.value })
    });
    els.passcode.value = "";
    state.authenticated = true;
    startStatusLoop();
  } catch (error) {
    toast(error.message, "error");
  } finally {
    button.disabled = false;
  }
});

els.logoutButton.addEventListener("click", async () => {
  await api("/api/logout", { method: "POST", body: "{}" }).catch(() => {});
  clearTimeout(state.statusTimer);
  state.authenticated = false;
  els.connectionState.textContent = "Locked";
  setView("login");
});

els.refreshQrButton.addEventListener("click", async () => {
  els.refreshQrButton.disabled = true;
  els.connectionState.textContent = "Refreshing QR";
  els.qrTitle.textContent = "Refreshing QR";
  els.qrHint.textContent = "Wait for a fresh code before scanning again.";
  els.qrImage.hidden = true;
  els.qrImage.removeAttribute("src");
  els.qrSpinner.hidden = false;

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

    els.emptyState.hidden = true;
    els.sentBubble.hidden = false;
    els.sentBubble.textContent = message;
    els.message.value = "";
    toast("Sent");
    await refreshStatus();
  } catch (error) {
    toast(error.message, "error");
  } finally {
    els.sendButton.disabled = false;
    els.message.focus();
  }
});

await loadConfig().catch(() => {});
const initialStatus = await refreshStatus();
if (state.authenticated) startStatusLoop(nextPollDelay(initialStatus));
