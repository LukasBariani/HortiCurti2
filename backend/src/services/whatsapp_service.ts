import { Client, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath: "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

export function initZap() {
  client.on("qr", (qr: any) => {
    qrcode.generate(qr, { small: true });
  });

  client.on("ready", () => {
    console.log("Zap Conectado!");
  });
  client.on("message", (msg: any) => {
    if (msg.body == "!ping") {
      msg.reply("neymar");
    }
  });
  client.initialize();
}
