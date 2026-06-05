# SSR attendence WhatsApp Sender

A single-purpose web app for sending messages to exactly one WhatsApp group: **SSR attendence Group**.

The browser UI does not expose contacts, chats, group selection, message deletion, or message history. The backend accepts only a message body and always sends to the server-configured group.

## Important WhatsApp Note

This project uses `whatsapp-web.js` because normal WhatsApp group sending is not available through the standard one-to-one WhatsApp Cloud API flow. Some official WhatsApp Business Platform group features exist only for qualified Official Business Accounts and are not the same as a personal account joining an existing group.

Use a dedicated WhatsApp account that belongs only to the target group if you want the strongest operational separation.

## What Is Locked Down

- One fixed group name in the UI: `SSR attendence Group`
- One fixed recipient on the server via `WHATSAPP_GROUP_ID` or exact `TARGET_GROUP_NAME`
- Passcode-protected access
- HTTP-only signed session cookie
- No contact list endpoint
- No chat list endpoint
- No recipient field in the send request
- No delete-message endpoint
- No message database
- Secrets stay in Render environment variables, not Git

## Local Setup

```bash
npm install
copy .env.example .env
npm start
```

For local UI-only testing, set:

```env
WHATSAPP_TRANSPORT=mock
NODE_ENV=development
APP_PASSCODE=dev-passcode
SESSION_SECRET=dev-session-secret-change-me
```

Then open `http://localhost:10000`.

## WhatsApp Setup

1. Use a WhatsApp account that is already a member of **SSR attendence Group**.
2. Start the app with `WHATSAPP_TRANSPORT=webjs`.
3. Sign in to the web app using `APP_PASSCODE`.
4. Scan the QR code shown in the app.
5. Send one test message.
6. Check the server logs if the group cannot be found by name.
7. Set `WHATSAPP_GROUP_ID` once you know the exact group id.

`WHATSAPP_GROUP_ID` is preferred because group names can collide or change. It usually looks like `120363000000000000@g.us`.

### Show the QR Code

To make the QR code appear, your environment must use the real WhatsApp Web transport:

```env
WHATSAPP_TRANSPORT=webjs
NODE_ENV=development
APP_PASSCODE=your-local-passcode
SESSION_SECRET=your-long-local-session-secret
PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
```

Then run:

```bash
npm start
```

Open the app, enter `APP_PASSCODE`, and wait a few seconds. The QR panel appears when WhatsApp Web is ready to link. Scan it from WhatsApp using **Linked devices**.

If you deploy on Render, leave `PUPPETEER_EXECUTABLE_PATH` blank unless you install and manage your own browser path there. Render can use Puppeteer's downloaded browser during build.

If WhatsApp says **couldn't link device**:

1. In WhatsApp, remove old unused linked devices.
2. On the app page, click **Refresh QR** and wait for a new code.
3. Scan the new code immediately; QR codes expire quickly.
4. Keep the Render page open until the status changes to `Ready`.
5. If it still fails, redeploy with **Clear build cache & deploy** so Puppeteer starts with a clean browser cache.

### Phone Number / Dedicated Account

Do not put your personal mobile number in `.env`; this app does not need it. `whatsapp-web.js` uses the WhatsApp account that scans the QR code.

For the strongest restriction, use a dedicated WhatsApp account/SIM that is only a member of **SSR attendence Group**. A completely fake or dummy WhatsApp account is not practical because WhatsApp requires phone-number verification, but a separate real number used only for this group works well.

## Render Deployment

1. Push this repository to GitHub.
2. In Render, create a new Blueprint or Web Service from this repo.
3. Use the included `render.yaml` or these values:
   - Build command: `rm -rf /opt/render/.cache/puppeteer /opt/render/project/.cache/puppeteer && npm install`
   - Start command: `npm start`
   - Node version: `20.x`
4. Choose the Free instance type.
5. Set environment variables:

```env
NODE_ENV=production
WHATSAPP_TRANSPORT=webjs
TARGET_GROUP_NAME=SSR attendence Group
WWEBJS_AUTH_DIR=.wwebjs_auth
WHATSAPP_AUTO_START=false
WHATSAPP_IDLE_SHUTDOWN_MS=600000
NODE_OPTIONS=--max-old-space-size=128
PUPPETEER_CACHE_DIR=/opt/render/project/.cache/puppeteer
APP_PASSCODE=<your-private-passcode>
SESSION_SECRET=<long-random-secret>
WHATSAPP_GROUP_ID=<preferred-group-id-after-setup>
```

For paid/starter usage, add a persistent disk mounted at `/var/data` and change:

```env
WWEBJS_AUTH_DIR=/var/data/wwebjs_auth
```

Generate a session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## GitHub Secret Safety

Do not commit `.env`, `.wwebjs_auth`, `.wwebjs_cache`, or any QR/session files. They are already ignored by `.gitignore`.

Before pushing, you can check:

```bash
git status --short
git diff --cached
```

## Limitations

- `whatsapp-web.js` depends on WhatsApp Web and can break if WhatsApp changes its web client.
- Do not set `PUPPETEER_SKIP_DOWNLOAD=true` for real QR mode unless you also provide a working Chrome/Chromium path with `PUPPETEER_EXECUTABLE_PATH`.
- If Render still runs plain `npm install`, the repo has a `preinstall` script and `puppeteer.config.cjs` fallback that clear the broken Render Puppeteer cache and use a project-local browser cache.
- Free-tier optimization is enabled by default: Chrome starts only after login/status activity and shuts down after `WHATSAPP_IDLE_SHUTDOWN_MS` milliseconds without app activity.
- Render Free web services spin down after idle time and do not support persistent disks, so WhatsApp QR login can be lost after spin-down, restart, or redeploy. Use a paid service with a persistent disk if you need the linked session to survive.
- The app can restrict its own UI and API, but the linked WhatsApp account itself may still have whatever access it has inside WhatsApp. Use a dedicated account that only belongs to **SSR attendence Group** for best isolation.
# whatsapp
