const express = require('express');
const axios = require('axios');
const app = express().use(express.json());

// কনফিগারেশন (Render-এ সেট করব)
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

let sessions = {}; 

app.get('/webhook', (req, res) => {
    if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
        res.status(200).send(req.query['hub.challenge']);
    } else {
        res.sendStatus(403);
    }
});

app.post('/webhook', (req, res) => {
    let body = req.body;
    if (body.object === 'page') {
        body.entry.forEach(entry => {
            let event = entry.messaging[0];
            let sender_id = event.sender.id;
            let text = event.message ? event.message.text : "";
            if(text) handleChat(sender_id, text);
        });
        res.status(200).send('EVENT_RECEIVED');
    }
});

async function handleChat(id, text) {
    if (!sessions[id]) {
        sessions[id] = { step: 'name' };
        await sendMsg(id, "Welcome! Please enter your Full name:");
    } else if (sessions[id].step === 'name') {
        sessions[id].name = text;
        sessions[id].step = 'email';
        await sendMsg(id, "Please Enter your email:");
    } else if (sessions[id].step === 'email') {
        sessions[id].email = text;
        sessions[id].step = 'phone';
        await sendMsg(id, "Please enter your phone number:");
    } else if (sessions[id].step === 'phone') {
        sessions[id].phone = text;
        sessions[id].step = 'confirm';
        let msg = `Data Summary:\nName: ${sessions[id].name}\nEmail: ${sessions[id].email}\nPhone: ${sessions[id].phone}\n\nType "Ok" to save or correct it.`;
        await sendMsg(id, msg);
    } else if (sessions[id].step === 'confirm' && text.toLowerCase() === 'ok') {
        try {
            await axios.post(GOOGLE_SCRIPT_URL, sessions[id]);
            await sendMsg(id, "Data Saved successfully!");
            delete sessions[id];
        } catch (e) { await sendMsg(id, "Error saving data."); }
    }
}

async function sendMsg(id, text) {
    await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
        recipient: { id: id },
        message: { text: text }
    });
}

app.listen(process.env.PORT || 3000, () => console.log('Bot is live!'));