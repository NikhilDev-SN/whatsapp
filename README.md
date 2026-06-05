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

## Render Deployment

1. Push this repository to GitHub.
2. In Render, create a new Blueprint or Web Service from this repo.
3. Use the included `render.yaml` or these values:
   - Build command: `npm install`
   - Start command: `npm start`
   - Node version: Render default Node 18+ is fine
4. Add a persistent disk:
   - Mount path: `/var/data`
   - Size: `1 GB`
5. Set environment variables:

```env
NODE_ENV=production
WHATSAPP_TRANSPORT=webjs
TARGET_GROUP_NAME=SSR attendence Group
WWEBJS_AUTH_DIR=/var/data/wwebjs_auth
APP_PASSCODE=<your-private-passcode>
SESSION_SECRET=<long-random-secret>
WHATSAPP_GROUP_ID=<preferred-group-id-after-setup>
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
- Render needs a persistent disk or the QR login can be lost on redeploys.
- The app can restrict its own UI and API, but the linked WhatsApp account itself may still have whatever access it has inside WhatsApp. Use a dedicated account that only belongs to **SSR attendence Group** for best isolation.
