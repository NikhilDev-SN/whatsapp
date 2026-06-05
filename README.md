# SSR attendence WhatsApp Sender

Simple web page for sending messages to one WhatsApp group: **SSR attendence Group**.

Open the app, scan the WhatsApp QR code, type a message, and send. There is no unlock screen and no contact/chat browser.

## What It Allows

- Shows only the fixed group name
- Sends only to `WHATSAPP_GROUP_ID` or `TARGET_GROUP_NAME`
- Accepts only a message body
- Does not expose contacts, chats, recipients, history, or delete controls
- Keeps `.env` and WhatsApp session files out of Git

Anyone who can open your deployed Render URL can send to the configured group. Keep the URL private, or add access control later if you need it.

## Local Setup

```bash
npm install
copy .env.example .env
npm start
```

Open `http://localhost:10000`.

For local UI testing without WhatsApp:

```env
WHATSAPP_TRANSPORT=mock
NODE_ENV=development
```

## WhatsApp Setup

1. Use a WhatsApp account that is already in **SSR attendence Group**.
2. Start the app with `WHATSAPP_TRANSPORT=webjs`.
3. Open the app and wait for the QR code.
4. In WhatsApp, go to **Linked devices > Link a device**.
5. Scan the QR code.
6. Send one test message.
7. Set `WHATSAPP_GROUP_ID` after first setup if group lookup by name is unreliable.

`WHATSAPP_GROUP_ID` is preferred because group names can change or collide. It usually looks like `120363000000000000@g.us`.

If WhatsApp says **couldn't link device**:

1. Remove old unused linked devices in WhatsApp.
2. Click **Refresh QR** and wait for a new code.
3. Scan quickly; QR codes expire.
4. Keep the Render page open until the status changes to `Ready`.
5. If needed, redeploy with **Clear build cache & deploy**.

## Render

Build command:

```bash
rm -rf /opt/render/.cache/puppeteer /opt/render/project/.cache/puppeteer && npm install
```

Start command:

```bash
npm start
```

Environment variables:

```env
NODE_ENV=production
WHATSAPP_TRANSPORT=webjs
TARGET_GROUP_NAME=SSR attendence Group
WWEBJS_AUTH_DIR=.wwebjs_auth
WHATSAPP_AUTO_START=false
WHATSAPP_IDLE_SHUTDOWN_MS=600000
NODE_OPTIONS=--max-old-space-size=128
PUPPETEER_CACHE_DIR=/opt/render/project/.cache/puppeteer
WHATSAPP_GROUP_ID=
```

Render Free can sleep/restart and may lose the WhatsApp linked session. For a more stable QR login, use a paid service with a persistent disk and set:

```env
WWEBJS_AUTH_DIR=/var/data/wwebjs_auth
```

## Secret Safety

Do not commit `.env`, `.wwebjs_auth`, `.wwebjs_cache`, or QR/session files. They are ignored in `.gitignore`.

## Commands

```bash
npm test
npm start
```
