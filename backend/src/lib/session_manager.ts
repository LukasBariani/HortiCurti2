type Estado = 'IDLE' | 'AGUARDANDO_PEDIDO' | 'CONFIRMANDO' | 'EDITANDO';

type whatsappNumber = string;

const clienteSessions = new Map<whatsappNumber, Sessao>();

interface Sessao {
  estado: Estado;
  itensParsed: any[];
  clienteId: string;
  rawMessage: string;
}

export function getSession(whatsappNumber: whatsappNumber) {
  if (!clienteSessions.has(whatsappNumber)) {
    clienteSessions.set(whatsappNumber, {
      estado: 'IDLE',
      itensParsed: [],
      clienteId: '',
      rawMessage: '',
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
