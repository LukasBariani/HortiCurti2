import { getSession, setSession, deleteSession, Sessao, ParsedItem } from '../lib/session_manager';
import { DeliveryDateError, formatDeliveryDate, parseDeliveryMessage, validateDeliveryDate } from '../lib/delivery_date';

interface Message {
  body: string;
  reply(text: string): Promise<unknown>;
}
interface Dependencies {
  parseMessage(text: string): Promise<{ items?: ParsedItem[] }>;
  createOrder(data: { clientId: string; rawMessage: string; items: ParsedItem[]; deliveryDate: string }): Promise<unknown>;
  findOrdersByClientId(id: string): Promise<Array<{ deliveryDate: Date; items: ParsedItem[] }>>;
  now?: () => Date;
}
const askDate = 'Para qual data é a entrega? Envie a data completa no formato DD/MM/AAAA (hoje ou uma data futura).';
const itemPreview = (items: ParsedItem[]) => items.map(
  (item) => `• ${item.quantity}x ${item.productName} (${item.unit})`,
).join('\n');

// Independente do Chrome/Groq: permite testar sem enviar mensagens reais.
export function createOrderConversation(deps: Dependencies) {
  const pending = new Map<string, Promise<void>>();
  const now = () => deps.now?.() ?? new Date();

  async function handleIdle(msg: Message, session: Sessao, phone: string) {
    if (msg.body.trim() === '1') {
      setSession(phone, { ...session, estado: 'AGUARDANDO_PEDIDO' });
      await msg.reply('Ótimo! Me manda seu pedido completo em uma mensagem.\nExemplo: 2 alface crespa, 1 kg cenoura, 3 cx tomate.');
    } else if (msg.body.trim() === '2') {
      const orders = await deps.findOrdersByClientId(session.clienteId);
      await msg.reply(orders.length
        ? '*Seus pedidos dos últimos 7 dias:*\n\n' + orders.map((order) =>
          `📅 *Entrega em ${formatDeliveryDate(order.deliveryDate)}*\n${itemPreview(order.items)}`).join('\n\n')
        : 'Você não possui pedidos nos últimos 7 dias.');
    } else {
      await msg.reply('Olá! 👋 Bem-vindo ao sistema de pedidos\n1 - Fazer pedido\n2 - Ver meus pedidos anteriores.');
    }
  }

  async function handleAguardandoPedido(msg: Message, session: Sessao, phone: string) {
    const result = await deps.parseMessage(msg.body);
    if (!Array.isArray(result?.items) || !result.items.length || result.items.some((item) =>
      !item || typeof item.productName !== 'string' || !item.productName.trim() ||
      typeof item.unit !== 'string' || !item.unit.trim() ||
      typeof item.quantity !== 'number' || !Number.isFinite(item.quantity) || item.quantity <= 0)) {
      await msg.reply('Não consegui entender o pedido. Envie novamente os produtos e as quantidades.');
      return;
    }
    setSession(phone, {
      ...session, estado: 'AGUARDANDO_DATA', itensParsed: result.items,
      rawMessage: msg.body, deliveryDate: '',
    });
    await msg.reply(askDate);
  }

  async function handleAguardandoData(msg: Message, session: Sessao, phone: string) {
    let deliveryDate: string;
    try {
      deliveryDate = parseDeliveryMessage(msg.body, now());
    } catch (error) {
      if (!(error instanceof DeliveryDateError)) throw error;
      await msg.reply(`${error.message}\n${askDate}`);
      return;
    }
    setSession(phone, { ...session, estado: 'CONFIRMANDO', deliveryDate });
    await msg.reply(`Pedido para ${formatDeliveryDate(deliveryDate)}:\n${itemPreview(session.itensParsed)}\n\nDigite *confirmar* para finalizar, *editar* para corrigir os itens ou *data* para mudar a entrega.`);
  }

  async function handleConfirmando(msg: Message, session: Sessao, phone: string) {
    const command = msg.body.trim().toLowerCase();
    if (command === 'editar') {
      setSession(phone, { ...session, estado: 'EDITANDO', deliveryDate: '' });
      await msg.reply('Ok! Me manda seu pedido completo novamente.');
      return;
    }
    if (command === 'data') {
      setSession(phone, { ...session, estado: 'AGUARDANDO_DATA', deliveryDate: '' });
      await msg.reply(askDate);
      return;
    }
    if (command !== 'confirmar') {
      await msg.reply('Digite *confirmar*, *editar* ou *data*.');
      return;
    }
    try {
      // O cliente pode ter deixado a confirmação aberta durante a madrugada.
      validateDeliveryDate(session.deliveryDate, now());
      await deps.createOrder({
        clientId: session.clienteId, rawMessage: session.rawMessage,
        items: session.itensParsed, deliveryDate: session.deliveryDate,
      });
    } catch (error) {
      if (error instanceof DeliveryDateError) {
        setSession(phone, { ...session, estado: 'AGUARDANDO_DATA', deliveryDate: '' });
        await msg.reply(`${error.message}\n${askDate}`);
      } else {
        console.error('Erro ao salvar pedido:', error);
        await msg.reply('Não consegui salvar seu pedido. Seus itens e a data foram mantidos. Digite *confirmar* para tentar novamente.');
      }
      return;
    }
    deleteSession(phone);
    await msg.reply(`Pedido confirmado! ✅ Entrega em ${formatDeliveryDate(session.deliveryDate)}.`);
  }

  async function process(msg: Message, phone: string, clientId: string) {
    const session = { ...getSession(phone), clienteId: clientId };
    setSession(phone, session);
    switch (session.estado) {
      case 'IDLE': return handleIdle(msg, session, phone);
      case 'AGUARDANDO_PEDIDO': return handleAguardandoPedido(msg, session, phone);
      case 'EDITANDO': return handleAguardandoPedido(msg, session, phone);
      case 'AGUARDANDO_DATA': return handleAguardandoData(msg, session, phone);
      case 'CONFIRMANDO': return handleConfirmando(msg, session, phone);
    }
  }

  return async (msg: Message, phone: string, clientId: string) => {
    // Serializa mensagens do contato: dois "confirmar" não criam dois pedidos.
    const previous = pending.get(phone) ?? Promise.resolve();
    const current = previous.catch(() => {}).then(() => process(msg, phone, clientId));
    pending.set(phone, current);
    try {
      await current;
    } finally {
      if (pending.get(phone) === current) pending.delete(phone);
    }
  };
}
