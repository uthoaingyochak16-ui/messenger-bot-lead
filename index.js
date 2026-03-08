const express = require("express");
const axios = require("axios");

const app = express();

app.use(express.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const SCRIPT_URL = process.env.SCRIPT_URL;
const PORT = process.env.PORT || 3000;



// =============================
// VERIFY WEBHOOK
// =============================

app.get("/webhook", (req, res) => {

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {

    return res.status(200).send(challenge);

  }

  res.sendStatus(403);

});



// =============================
// MAIN WEBHOOK
// =============================

app.post("/webhook", async (req, res) => {

  const body = req.body;

  if (body.object === "page") {

    for (const entry of body.entry) {

      const event = entry.messaging[0];

      const sender = event.sender.id;

      const msg = event.message?.text;

      if (!msg) continue;


      // ---------- HI / HELLO ----------

      if (
        msg.toLowerCase() === "hi" ||
        msg.toLowerCase() === "hello"
      ) {

        await sendButtons(sender);

        return res.sendStatus(200);

      }


      // ---------- OPTION 2 ----------

      if (msg === "2") {

        await sendText(
          sender,
          "আমাদের সম্পর্কে জানতে এখানে যান:\nhttps://quantummethod.org.bd/bn"
        );

        return res.sendStatus(200);

      }


      // ---------- OPTION 1 OR DATA ----------

      try {

        const r = await axios.post(SCRIPT_URL, {
          text: msg
        });

        const data = r.data;

        if (data.status === "exist") {

          await sendText(
            sender,
            `Hello ${data.name}
এই নাম্বারে আগে entry আছে
Problem: ${data.problem}`
          );

        }

        if (data.status === "saved") {

          await sendText(
            sender,
            `Thanks ${data.name}
Phone: ${data.phone}
Problem: ${data.problem}
Save হয়েছে`
          );

        }

      } catch (e) {

        await sendText(sender, "Error,Try again.");

      }

    }

  }

  res.sendStatus(200);

});



// =============================
// SEND TEXT
// =============================

async function sendText(id, text) {

  await axios.post(
    `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    {
      recipient: { id },
      message: { text }
    }
  );

}



// =============================
// SEND BUTTONS
// =============================

async function sendButtons(id) {

  await axios.post(
    `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    {
      recipient: { id },

      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text:
              "আমি আপনাকে কিভাবে সাহায্য করতে পারি?",

            buttons: [
              {
                type: "postback",
                title: "প্রতিনিধির সাথে যোগাযোগ",
                payload: "1"
              },

              {
                type: "postback",
                title: "আমাদের সম্পর্কে",
                payload: "2"
              }
            ]
          }
        }
      }

    }
  );

}



app.listen(PORT, () => {
  console.log("Server running");
});
