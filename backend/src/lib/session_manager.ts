type Estado = 'IDLE' | 'AGUARDANDO_PEDIDO' | 'AGUARDANDO_DATA' | 'CONFIRMANDO' | 'EDITANDO';

export interface ParsedItem {
  productName: string;
  quantity: number;
  unit: string;
}

type whatsappNumber = string;

const clienteSessions = new Map<whatsappNumber, Sessao>();

export interface Sessao {
  estado: Estado;
  itensParsed: ParsedItem[];
  clienteId: string;
  rawMessage: string;
  deliveryDate: string;
}

export function getSession(whatsappNumber: whatsappNumber) {
  if (!clienteSessions.has(whatsappNumber)) {
    clienteSessions.set(whatsappNumber, {
      estado: 'IDLE',
      itensParsed: [],
      clienteId: '',
      rawMessage: '',
      deliveryDate: '',
    });
  }
  return clienteSessions.get(whatsappNumber)!;
}

export function setSession(whatsappNumber: whatsappNumber, session: Sessao) {
  clienteSessions.set(whatsappNumber, session);
}

export function deleteSession(whatsappNumber: whatsappNumber) {
  clienteSessions.delete(whatsappNumber);
}
