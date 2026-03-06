const express = require('express');
const axios = require('axios');
const app = express().use(require('body-parser').json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbweWSMJ1CWAkR9WpZaP33Kgce-zN-01lfQwHvOZfX6Do9k-7emw3K8h6F-aJpi8mlRd/exec'; 

// ইউজার সেশন স্টোর করার জন্য
let sessions = {};

app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.status(200).send(req.query['hub.challenge']);
  } else { res.sendStatus(403); }
});

app.post('/webhook', async (req, res) => {
  let body = req.body;
  if (body.object === 'page') {
    for (let entry of body.entry) {
      let event = entry.messaging[0];
      let sender_id = event.sender.id;
      let text = event.message.text;

      if (!sessions[sender_id]) {
        sessions[sender_id] = { step: 1, name: "", phone: "", problem: "" };
        sendMessage(sender_id, "হ্যালো! আপনার নাম কি?");
      } 
      else if (sessions[sender_id].step === 1) {
        sessions[sender_id].name = text;
        sessions[sender_id].step = 2;
        sendMessage(sender_id, `ধন্যবাদ ${text}। আপনার ফোন নম্বরটি দিন।`);
      } 
      else if (sessions[sender_id].step === 2) {
        sessions[sender_id].phone = text;
        sessions[sender_id].step = 3;
        sendMessage(sender_id, "আপনার সমস্যাটি বিস্তারিত লিখুন।");
      } 
      else if (sessions[sender_id].step === 3) {
        sessions[sender_id].problem = text;
        // শিটে ডাটা পাঠানো
        await axios.post(SHEET_URL, sessions[sender_id]);
        sendMessage(sender_id, "ধন্যবাদ! আপনার তথ্য সেভ করা হয়েছে। আমাদের প্রতিনিধি যোগাযোগ করবেন।");
        delete sessions[sender_id]; // সেশন ক্লিয়ার করা
      }
    }
    res.status(200).send('EVENT_RECEIVED');
  }
});

async function sendMessage(id, txt) {
  await axios.post(`https://graph.facebook.com/v15.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    recipient: { id: id }, message: { text: txt }
  });
}

app.listen(process.env.PORT || 10000);