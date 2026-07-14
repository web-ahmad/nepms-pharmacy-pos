import express from 'express';
import cors from 'cors';
import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import * as QRCodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import pino from 'pino';
import { Boom } from '@hapi/boom';
import fs from 'fs';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

let qrDataURL: string | null = null;
let isConnected = false;
let sock: ReturnType<typeof makeWASocket> | null = null;

// ── Config ────────────────────────────────────────────────────────────────────
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const BOT_ENDPOINT = `${BACKEND_URL}/api/v1/bot/incoming`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPhoneNumber(phone: string): string {
    let cleanNumber = phone.replace(/[^0-9]/g, '');
    if (cleanNumber.startsWith('0')) {
        cleanNumber = '92' + cleanNumber.substring(1);
    } else if (cleanNumber.length === 10 && !cleanNumber.startsWith('92')) {
        cleanNumber = '92' + cleanNumber;
    }
    return cleanNumber + '@s.whatsapp.net';
}

/**
 * Forward an incoming message to the Python backend bot handler.
 * Returns the reply text, or null if the message should be silently ignored.
 */
async function forwardToBotHandler(sender: string, body: string, fromMe: boolean | null | undefined): Promise<string | null> {
    try {
        const resp = await fetch(BOT_ENDPOINT, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ sender, body, fromMe }),
            // @ts-ignore
            timeout: 30000,   // reports can take a moment
        });
        if (!resp.ok) {
            console.error(`[Bot] Backend responded ${resp.status}`);
            return null;
        }
        const data = await resp.json() as { reply: string | null };
        return data.reply ?? null;
    } catch (err) {
        console.error('[Bot] Failed to reach backend:', err);
        return null;
    }
}

// ── WhatsApp Connection ───────────────────────────────────────────────────────

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }) as any,
    });

    sock.ev.on('creds.update', saveCreds);

    // ── Connection state ─────────────────────────────────────────────────────
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrDataURL = await QRCode.toDataURL(qr);
            QRCodeTerminal.generate(qr, { small: true });
            isConnected = false;
        }

        if (connection === 'close') {
            isConnected = false;
            qrDataURL = null;
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed:', lastDisconnect?.error, '| reconnecting:', shouldReconnect);
            if (shouldReconnect) {
                setTimeout(() => connectToWhatsApp(), 2000);
            } else {
                console.log('Logged out — deleting session and restarting...');
                if (fs.existsSync('auth_info_baileys')) {
                    fs.rmSync('auth_info_baileys', { recursive: true, force: true });
                }
                if (sock) {
                    sock.ev.removeAllListeners('connection.update');
                    sock.ev.removeAllListeners('creds.update');
                    sock = null;
                }
                setTimeout(() => connectToWhatsApp(), 2000);
            }
        } else if (connection === 'open') {
            console.log('✅ WhatsApp Client connected!');
            isConnected = true;
            qrDataURL = null;
        }
    });

    // ── Incoming message listener ────────────────────────────────────────────
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        // Only process new messages pushed in real-time, not history
        if (type !== 'notify') return;

        for (const msg of messages) {
            const fromMe = msg.key.fromMe;
            let sender = msg.key.remoteJid;
            if (!sender) continue;

            // Handle linked devices appending :ID to the JID (e.g. 923144236077:1@s.whatsapp.net)
            if (sender.includes(':')) {
                sender = sender.split(':')[0] + '@s.whatsapp.net';
            }

            // Skip group messages — bot only handles 1-on-1 chats
            if (sender.endsWith('@g.us')) continue;

            // Extract text from various message types
            const body = (
                msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text ||
                msg.message?.imageMessage?.caption ||
                ''
            ).trim();

            if (!body) continue;

            console.log(`[Bot] Incoming from ${sender} (fromMe: ${fromMe}): "${body}"`);

            // Forward to Python backend
            const reply = await forwardToBotHandler(sender, body, fromMe);

            // null means silently ignore (non-whitelisted sender or empty)
            if (!reply || !sock) continue;

            try {
                await sock.sendMessage(sender, { text: reply });
                console.log(`[Bot] Replied to ${sender}`);
            } catch (err) {
                console.error(`[Bot] Failed to send reply to ${sender}:`, err);
            }
        }
    });
}

connectToWhatsApp();

// ── HTTP API ──────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
    res.json({ connected: isConnected });
});

app.get('/qr', (_req, res) => {
    res.json({ connected: isConnected, qr: qrDataURL });
});

app.post('/send', async (req, res) => {
    if (!isConnected || !sock) {
        return res.status(503).json({ error: 'WhatsApp is not connected' });
    }

    const { phone, message, imageUrl } = req.body;
    if (!phone || !message) {
        return res.status(400).json({ error: 'Phone and message are required' });
    }

    const formattedPhone = formatPhoneNumber(phone);

    try {
        let sentMessage;
        if (imageUrl) {
            sentMessage = await sock.sendMessage(formattedPhone, {
                image: { url: imageUrl },
                caption: message,
            });
        } else {
            sentMessage = await sock.sendMessage(formattedPhone, { text: message });
        }
        res.json({ success: true, messageId: sentMessage?.key?.id });
    } catch (error) {
        console.error('Failed to send message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 WhatsApp Baileys Service running on port ${PORT}`);
    console.log(`   Bot backend: ${BOT_ENDPOINT}`);
});
