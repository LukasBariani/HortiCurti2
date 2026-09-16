import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { findCLientByPhone } from './client_service';
import { parseMessage } from './aiParse_service';
import { createOrder, findOrdersByClientId } from './order_service';
import { createOrderConversation } from './order_conversation';

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});
const handleMessage = createOrderConversation({ parseMessage, createOrder: (data) => createOrder(data, 'whatsapp'), findOrdersByClientId });

export function initZap() {
  client.on('qr', (qr) => qrcode.generate(qr, { small: true }));
  client.on('ready', () => console.log('Zap Conectado!'));
  client.on('message', async (msg) => {
    if (!msg.body?.trim() || msg.fromMe) return;
    if (!msg.from.endsWith('@c.us') && !msg.from.endsWith('@lid')) return;
    try {
      const contact = await msg.getContact();
      const customer = await findCLientByPhone(contact.id.user);
      if (!customer) return;
      await handleMessage(msg, msg.from, customer.id);
    } catch (error) {
      console.error('Erro ao processar mensagem do WhatsApp:', error);
      await msg.reply('Não consegui processar sua mensagem agora. Tente novamente.').catch(console.error);
    }
  });
  client.initialize().catch((error) => console.error('Erro ao conectar WhatsApp:', error));
}
