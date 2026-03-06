const express = require('express');
const axios = require('axios');
const app = express().use(require('body-parser').json());

const PAGE_ACCESS_TOKEN = "EAAXxvXfFpKEBQ0Qjs7nBD5UGPjPSnL1ImAR6H6ZAuySL1eRiZBEiu50pZCM6bUNmZBSr3rgxMAZCkyusUjorqWDM71uSIS8kaIv05yZChWhmYkAi8RWZBnfbXfZAQRGU2ZAsAXcA92cggO35DKCecQngqwVDyubsIrrj2ZBAUQI37s8bCVo00oq85dAxjtTTvw8nf8uHmlgI3fIwZDZD";
const SHEET_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbweWSMJ1CWAkR9WpZaP33Kgce-zN-01lfQwHvOZfX6Do9k-7emw3K8h6F-aJpi8mlRd/exec";

let sessions = {}; 

app.post('/webhook', async (req, res) => {
    const entry = req.body.entry[0].messaging[0];
    const senderId = entry.sender.id; // এটিই আপনার SI, যা অটোমেটিক জেনারেট হয়
    const text = entry.message.text;

    if (!sessions[senderId]) {
        sessions[senderId] = { step: 1, name: "", phone: "", problem: "" };
        sendFB(senderId, "হ্যালো! আপনার নাম কি?");
    } 
    else if (sessions[senderId].step === 1) {
        sessions[senderId].name = text;
        sessions[senderId].step = 2;
        // এখানে ${sessions[senderId].name} দিয়ে ইউজারের নাম ব্যবহার করা হয়েছে
        sendFB(senderId, `ধন্যবাদ ${text}। এবার আপনার ফোন নম্বরটি দিন।`);
    } 
    else if (sessions[senderId].step === 2) {
        sessions[senderId].phone = text;
        sessions[senderId].step = 3;
        sendFB(senderId, "আপনার সমস্যাটি বিস্তারিত লিখুন।");
    } 
    else if (sessions[senderId].step === 3) {
        sessions[senderId].problem = text;
        
        // সামারি তৈরি করা
        let summary = `আপনার দেওয়া তথ্যগুলো:\nনাম: ${sessions[senderId].name}\nফোন: ${sessions[senderId].phone}\nসমস্যা: ${sessions[senderId].problem}`;
        sendFB(senderId, summary + "\n\nতথ্যগুলো শিটে জমা করা হচ্ছে...");

        // অটোমেটিক SI এবং ডাটা পাঠানো
        await axios.post(SHEET_WEB_APP_URL, {
            si: senderId, // অটোমেটিক জেনারেটেড আইডি
            name: sessions[senderId].name,
            phone: sessions[senderId].phone,
            problem: sessions[senderId].problem
        });

        sendFB(senderId, "সফলভাবে সেভ করা হয়েছে!");
        delete sessions[senderId]; // সেশন ক্লিয়ার
    }
    res.status(200).send('EVENT_RECEIVED');
});

async function sendFB(id, text) {
    await axios.post(`https://graph.facebook.com/v15.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
        recipient: { id: id }, message: { text: text }
    });
}
app.listen(process.env.PORT || 3000);