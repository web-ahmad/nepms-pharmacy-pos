const express = require('express');
const cors = require('cors');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

let qrDataURL = null;
let isConnected = false;

// Initialize WhatsApp Client with LocalAuth to persist session
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', async (qr) => {
    console.log('QR Code received');
    try {
        qrDataURL = await qrcode.toDataURL(qr);
        isConnected = false;
    } catch (err) {
        console.error('Failed to generate QR data URL', err);
    }
});

client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
    isConnected = true;
    qrDataURL = null;
});

client.on('authenticated', () => {
    console.log('WhatsApp Client authenticated');
});

client.on('auth_failure', msg => {
    console.error('WhatsApp Authentication failure', msg);
    isConnected = false;
});

client.on('disconnected', (reason) => {
    console.log('WhatsApp Client disconnected', reason);
    isConnected = false;
});

// Start the client
client.initialize();

// API Endpoints
app.get('/api/v1/settings/whatsapp/qr', (req, res) => {
    res.json({
        connected: isConnected,
        qr: qrDataURL
    });
});

app.post('/send', async (req, res) => {
    if (!isConnected) {
        return res.status(503).json({ error: 'WhatsApp is not connected' });
    }

    const { phone, message, media } = req.body;
    
    if (!phone || !message) {
        return res.status(400).json({ error: 'Phone and message are required' });
    }

    // Format phone number to international format without + (e.g., 923001234567@c.us)
    const formattedPhone = phone.replace(/[^0-9]/g, '') + '@c.us';

    try {
        let sentMessage;
        
        if (media && Array.isArray(media)) {
            // Send text first
            await client.sendMessage(formattedPhone, message);
            // Then send media
            for (const item of media) {
                if (item.base64 && item.mimetype) {
                    const mediaObj = new MessageMedia(item.mimetype, item.base64, item.filename || 'media');
                    await client.sendMessage(formattedPhone, mediaObj);
                }
            }
            sentMessage = { status: 'success, with media' };
        } else {
            sentMessage = await client.sendMessage(formattedPhone, message);
        }
        
        res.json({ success: true, messageId: sentMessage.id });
    } catch (error) {
        console.error('Failed to send message', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`WhatsApp Microservice running on port ${PORT}`);
});
