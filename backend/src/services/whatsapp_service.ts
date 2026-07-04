import { Client, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { findCLientByPhone } from "./client_service";
import { findOrCreateTodayShoppingDay } from "./shopDay_service";
import { parseMessage } from "../services/aiParse_service";
import { createOrder } from "./order_service";

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

  client.on("message", async (msg: any) => {
    if (!msg.body?.trim()) {
      return;
    }
    if (!msg.from.endsWith("@c.us") && !msg.from.endsWith("@lid")) return;
    if (msg.fromMe) return;

    const contato = await msg.getContact();

    const numeroLimpo = msg.from.replace("@c.us", "").replace("@lid", "");
    // Verifica se a mensagem é de um contato válido
    const clienteEncontrado = await findCLientByPhone(contato.id.user);
    if (!clienteEncontrado) {
      console.log(`Cliente não cadastrado: ${numeroLimpo}`);
      return;
    } else {
      console.log("contato.number:", contato.number);
      console.log("contato.id.user:", contato.id.user);
      console.log("msg.from:", msg.from);
      console.log("msg.from replace:", msg.from.replace("@c.us", ""));
    }
    const resultadoParse = await parseMessage(msg.body);
    // Verifica se o resultado do parse está vazio
    if (resultadoParse.items.length === 0) {
      console.log("O retorno está vazia");
      msg.reply(
        "Desculpe, não consegui entender sua mensagem. Por favor, tente novamente.",
      );
      return;
    } else {
      console.log(
        `Mensagem recebida de: ${numeroLimpo} (${contato.pushname || "Sem nome"})`,
      );
      console.log(JSON.stringify(resultadoParse, null, 2));
      console.log(`Texto: ${msg.body}`);
      msg.reply("Recebi sua mensagem! Estou processando seu pedido...");

      const shoppingDay = await findOrCreateTodayShoppingDay();
      const order = await createOrder({
        clientId: clienteEncontrado.id,
        shoppingDayId: shoppingDay.id,
        rawMessage: msg.body,
        items: resultadoParse.items,
      });
      msg.reply("Seu Pedido é " + order.id + " e está sendo processado!");
    }
  });
  client.initialize();
}
