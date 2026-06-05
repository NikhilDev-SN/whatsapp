const state = {
  authenticated: false,
  statusTimer: null,
  groupName: "SSR attendence Group"
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
  if (status.ready) {
    els.connectionState.textContent = "Ready";
    setView("composer");
    return;
  }

  if (status.qrDataUrl) {
    els.connectionState.textContent = "Scan to connect";
    els.qrImage.src = status.qrDataUrl;
    els.qrImage.hidden = false;
    els.qrSpinner.hidden = true;
    setView("qr");
    return;
  }

  els.connectionState.textContent = status.lastError || "Connecting";
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
  } catch (error) {
    state.authenticated = false;
    els.connectionState.textContent = "Locked";
    setView("login");
  }
}

function startStatusLoop() {
  clearInterval(state.statusTimer);
  state.statusTimer = setInterval(refreshStatus, 4000);
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
    await refreshStatus();
    startStatusLoop();
  } catch (error) {
    toast(error.message, "error");
  } finally {
    button.disabled = false;
  }
});

els.logoutButton.addEventListener("click", async () => {
  await api("/api/logout", { method: "POST", body: "{}" }).catch(() => {});
  clearInterval(state.statusTimer);
  state.authenticated = false;
  els.connectionState.textContent = "Locked";
  setView("login");
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
await refreshStatus();
if (state.authenticated) startStatusLoop();
