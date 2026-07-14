# NEPMS WhatsApp Baileys Service

This is a standalone microservice that provides an unofficial WhatsApp connection using Baileys. It replaces the Meta WhatsApp Business Cloud API.

## Installation

```bash
cd whatsapp_service
npm install
```

## Running the Service

```bash
npm start
```

## First-time Setup (QR Scan)
When you run the service for the first time, it will generate a QR code in the terminal.
1. Open WhatsApp on your phone.
2. Go to **Linked Devices** > **Link a Device**.
3. Scan the QR code shown in the terminal.

The session will be securely saved in the `auth_info_baileys` folder so you do not need to scan again on subsequent restarts.

## Endpoints
- `GET /health` : Returns `{ "connected": true/false }`
- `GET /qr` : Returns the QR code as a Data URL for UI display (if disconnected).
- `POST /send` : Internal endpoint to send messages. Accepts `{ phone: "string", message: "string", imageUrl: "string (optional)" }`.
