const express = require('express');
const axios = require('axios');
const app = express().use(require('body-parser').json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const SHEET_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbweWSMJ1CWAkR9WpZaP33Kgce-zN-01lfQwHvOZfX6Do9k-7emw3K8h6F-aJpi8mlRd/exec";

let sessions = {}; 

app.post('/webhook', async (req, res) => {
    const event = req.body.entry[0].messaging[0];
    const senderId = event.sender.id;
    const text = event.message.text.trim();

    // ১. চেক করা: ইউজার কি একবারে কমা দিয়ে সব তথ্য পাঠিয়েছে? (আপনার দেওয়া পাইথন লজিক)
    const parts = text.split(',');
    if (parts.length === 3) {
        const data = { si: senderId, name: parts[0].trim(), phone: parts[1].trim(), problem: parts[2].trim() };
        await saveToSheet(senderId, data);
        delete sessions[senderId]; // সেশন থাকলে মুছে ফেলা
        return res.status(200).send('EVENT_RECEIVED');
    }

    // ২. যদি একবারে না পাঠায়, তবে ধাপে ধাপে প্রশ্ন করা
    if (!sessions[senderId]) {
        sessions[senderId] = { step: 1, name: "", phone: "", problem: "" };
        sendFB(senderId, "হ্যালো! আপনি চাইলে 'নাম, নম্বর, সমস্যা' এভাবে কমা দিয়ে একবারে লিখতে পারেন। অথবা আমি ধাপে ধাপে জিজ্ঞাসা করছি, আপনার নাম কি?");
    } 
    else if (sessions[senderId].step === 1) {
        sessions[senderId].name = text;
        sessions[senderId].step = 2;
        sendFB(senderId, `ধন্যবাদ ${text}। এবার আপনার ফোন নম্বরটি দিন।`);
    } 
    else if (sessions[senderId].step === 2) {
        sessions[senderId].phone = text;
        sessions[senderId].step = 3;
        sendFB(senderId, "আপনার সমস্যাটি বিস্তারিত লিখুন।");
    } 
    else if (sessions[senderId].step === 3) {
        sessions[senderId].problem = text;
        await saveToSheet(senderId, sessions[senderId]);
        delete sessions[senderId];
    }
    res.status(200).send('EVENT_RECEIVED');
});

// কমন ফাংশন: শিটে সেভ করার জন্য
async function saveToSheet(senderId, data) {
    await axios.post(SHEET_WEB_APP_URL, data);
    sendFB(senderId, `সফলভাবে সেভ করা হয়েছে!\nনাম: ${data.name}\nফোন: ${data.phone}\nসমস্যা: ${data.problem}`);
}

async function sendFB(id, text) {
    await axios.post(`https://graph.facebook.com/v15.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
        recipient: { id: id }, message: { text: text }
    });
}
app.listen(process.env.PORT || 3000);
