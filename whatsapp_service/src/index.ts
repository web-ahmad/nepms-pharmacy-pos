import express from 'express';
import cors from 'cors';
import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import * as QRCodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import pino from 'pino';
import { Boom } from '@hapi/boom';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

let qrDataURL: string | null = null;
let isConnected = false;
let sock: ReturnType<typeof makeWASocket> | null = null;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }) as any // Suppress excessive logs
    });

    sock.ev.on('creds.update', saveCreds);

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
            console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
            // reconnect if not logged out
            if (shouldReconnect) {
                connectToWhatsApp();
            } else {
                console.log('Logged out. Please restart the service to generate a new QR code.');
            }
        } else if (connection === 'open') {
            console.log('WhatsApp Client is ready!');
            isConnected = true;
            qrDataURL = null;
        }
    });
}

connectToWhatsApp();

app.get('/health', (req, res) => {
    res.json({ connected: isConnected });
});

app.get('/qr', (req, res) => {
    res.json({ connected: isConnected, qr: qrDataURL });
});

function formatPhoneNumber(phone: string) {
    let cleanNumber = phone.replace(/[^0-9]/g, '');
    if (cleanNumber.startsWith('0')) {
        cleanNumber = '92' + cleanNumber.substring(1);
    } else if (cleanNumber.length === 10 && !cleanNumber.startsWith('92')) {
        cleanNumber = '92' + cleanNumber;
    }
    return cleanNumber + '@s.whatsapp.net';
}

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
                caption: message 
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
    console.log(`WhatsApp Baileys Service running on port ${PORT}`);
});
