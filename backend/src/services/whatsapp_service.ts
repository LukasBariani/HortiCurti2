import { Client, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { findCLientByPhone } from "./client_service";
import { findOrCreateTodayShoppingDay } from "./shopDay_service";
import { parseMessage } from "../services/aiParse_service";
import { createOrder } from "./order_service";
import { getSession, setSession, deleteSession } from "../lib/session_manager";

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
    if (!msg.from.endsWith("@c.us") && !msg.from.endsWith("@lid")) return; // verifica se a mensagem é de um contato válido (se n é de grupo ou de um bot)
    if (msg.fromMe) return;

    const contato = await msg.getContact();

    const numeroLimpo = msg.from.replace("@c.us", "").replace("@lid", "");
    // Verifica se a mensagem é de um contato válido
    const clienteEncontrado = await findCLientByPhone(contato.id.user);
    if (!clienteEncontrado) {
      console.log(
        `Mensagem recebida de: ${numeroLimpo} (${contato.pushname || "Sem nome"})`,
      );
      console.log(`---Cliente não cadastrado: ${numeroLimpo}---`);
      return;
    } else {
      console.log("contato.number:", contato.number);
      console.log("contato.id.user:", contato.id.user);
      console.log("msg.from:", msg.from);
      console.log("msg.from replace:", msg.from.replace("@c.us", ""));

      const sessao = getSession(numeroLimpo);

      // switch case fica aqui
      switch (sessao.estado) {
        case "IDLE":
          await handleIdle(msg, sessao, numeroLimpo);
          break;
        case "AGUARDANDO_PEDIDO":
          await handleAguardadoPedido(msg, sessao, numeroLimpo);
          break;
        case "CONFIRMANDO":
          await handleConfirmando(msg, sessao, numeroLimpo, clienteEncontrado);
          break;
        default:
          msg.reply("Estado desconhecido.");
      }
    }
  });
  client.initialize();
}

//esperando msg
async function handleIdle(msg: any, sessao: any, numeroLimpo: any) {
  if (msg.body.trim() === "1") {
    setSession(numeroLimpo, { ...sessao, estado: "AGUARDANDO_PEDIDO" });
    msg.reply(
      "Ótimo! 📝 Me manda seu pedido completo em uma mensagem.\nExemplo: 2 alface crespa, 1 kg cenoura, 3 cx tomate",
    );
  } else {
    msg.reply(
      "Olá! 👋 Bem-vindo ao sistema de pedidos\nDigite uma opção:\n1 - Fazer pedido\n2 - Ver meus pedidos anteriores.",
    );
    return;
  }
}

async function handleAguardadoPedido(msg: any, sessao: any, numeroLimpo: any) {
  const contato = await msg.getContact();
  const clienteEncontrado = await findCLientByPhone(contato.id.user);

  if (!clienteEncontrado) {
    console.log(`Cliente não encontrado para: ${contato.id.user}`);
    msg.reply(
      "Desculpe, não consegui identificar seu cadastro. Entre em contato com o suporte.",
    );
    return;
  }

  const resultadoParse = await parseMessage(msg.body);

  // Verifica se o resultado do parse está vazio
  if (resultadoParse.items.length === 0) {
    console.log("O retorno está vazia");
    msg.reply(
      "Desculpe, não consegui entender sua mensagem. Por favor, tente novamente.",
    );
    return;
  }

  console.log(
    `Mensagem recebida de: ${numeroLimpo} (${contato.pushname || "Sem nome"})`,
  );
  console.log(JSON.stringify(resultadoParse, null, 2));
  console.log(`Texto: ${msg.body}`);

  // monta a prévia formatada
  const previa = resultadoParse.items
    .map(
      (item: any) => `- ${item.quantity}x ${item.productName} (${item.unit})`,
    )
    .join("\n");

  // salva itens na sessão e muda estado
  setSession(numeroLimpo, {
    ...sessao,
    estado: "CONFIRMANDO",
    itensParsed: resultadoParse.items,
    clienteId: clienteEncontrado.id,
    rawMessage: msg.body,
  });

  msg.reply(
    `Seu pedido:\n${previa}\n\nDigite *confirmar* para finalizar ou *editar* para corrigir.`,
  );
}

async function handleConfirmando(
  msg: any,
  sessao: any,
  numeroLimpo: any,
  cliente: any,
) {
  console.log("CONFIRMANDO");
  const shoppingDay = await findOrCreateTodayShoppingDay();

  switch (msg.body.trim().toLowerCase()) {
    case "confirmar":
      await createOrder({
        clientId: sessao.clienteId,
        shoppingDayId: shoppingDay.id,
        rawMessage: sessao.rawMessage,
        items: sessao.itensParsed,
      });
      deleteSession(numeroLimpo);
      msg.reply("Pedido confirmado! ✅ Obrigado pelo seu pedido.");
      break;
    case "editar":
      await handleAguardadoPedido(msg, sessao, numeroLimpo);
      break;
    default:
      msg.reply("Estado desconhecido.");
  }

  // se confirmar, cria o pedido
  const order = await createOrder({
    clientId: sessao.clienteId,
    shoppingDayId: shoppingDay.id,
    rawMessage: sessao.rawMessage,
    items: sessao.itensParsed,
  });
}
async function handleEditando(sessao: any, numeroLimpo: any) {
  console.log("EDITANDO");
}
