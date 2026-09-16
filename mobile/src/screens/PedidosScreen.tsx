import React, { useRef, useState } from 'react';
import { Alert, FlatList, Modal, ScrollView, RefreshControl, Switch, TextInput, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DeliveryDateSelector from '../components/DeliveryDateSelector';
import ScreenHeader from '../components/ScreenHeader';
import StateView from '../components/StateView';
import { useDeliveryData } from '../hooks/useDeliveryData';
import { deliverOrder, editOrder, getOrdersByDeliveryDate, OrderMutationError, updateOrderStatus } from '../services/api';
import { formatDeliveryDate, todayInSaoPaulo } from '../utils/deliveryDate';
import { shadows, ThemeColors, useTheme, useThemedStyles } from '../theme';

interface Item { id: string; productName: string; quantity: number; unit: string }
type Status = 'pending' | 'delivered' | 'cancelled';
const labels: Record<Status, string> = { pending: 'Pendente', delivered: 'Entregue', cancelled: 'Cancelado' };
interface Backorder { id: string; productName: string; quantity: number; unit: string; status: 'pending' | 'transferred' }
interface Snapshot { status: Status; deliveryDate: string; items: Item[]; originatedBackorders?: Backorder[] }
interface History { id: string; action: string; actor: string; createdAt: string; before?: Snapshot; after?: Snapshot }
interface Order { id: string; client: { name: string }; items: Item[]; deliveryDate: string; status: Status; version: number; history?: History[]; originatedBackorders?: Backorder[]; receivedBackorders?: Backorder[] }
interface Draft { order: Order; date: string; items: (Item & { input: string })[] }
interface DeliveryDraft { order: Order; items: (Item & { missing: string; carryForward: boolean })[] }
function describeChanges(event: History): string[] {
  if (!event.before || !event.after || !['edited', 'delivered'].includes(event.action)) return [];
  const changes: string[] = [];
  if (event.action === 'edited' && event.before.deliveryDate !== event.after.deliveryDate) changes.push(`Entrega: ${formatDeliveryDate(event.before.deliveryDate)} → ${formatDeliveryDate(event.after.deliveryDate)}`);
  for (const item of event.before.items) {
    const after = event.after.items.find((candidate) => candidate.id === item.id);
    if (event.action === 'edited') {
      if (!after) changes.push(`${item.productName}: removido`);
      else if (after.quantity !== item.quantity) changes.push(`${item.productName}: ${item.quantity} → ${after.quantity} ${item.unit}`);
    } else {
      const missing = item.quantity - (after?.quantity ?? 0);
      if (missing > 0) {
        const carried = event.after.originatedBackorders?.some(backorder => backorder.productName === item.productName && backorder.unit === item.unit && backorder.quantity === missing);
        changes.push(`${item.productName}: faltou ${missing} ${item.unit}${carried ? ' · próximo pedido' : ' · encerrado'}`);
      }
    }
  }
  return changes;
}

export default function PedidosScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { date, setDate, data: orders, loading, error, refresh } = useDeliveryData<Order>(getOrdersByDeliveryDate);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deliveryDraft, setDeliveryDraft] = useState<DeliveryDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const mutate = async (operation: () => Promise<unknown>, editedDate?: string) => {
    if (submitting.current) return;
    submitting.current = true; setBusy(true);
    try {
      await operation(); setDraft(null); setDeliveryDraft(null);
      if (editedDate && editedDate !== date) setDate(editedDate); else await refresh();
    } catch (cause) {
      if (cause instanceof OrderMutationError && cause.status === 409) {
        setDraft(null); setDeliveryDraft(null); await refresh();
        Alert.alert('Pedido atualizado', 'Outra operação alterou este pedido. A lista foi recarregada; confira os dados antes de tentar novamente.');
      } else Alert.alert('Não foi possível salvar', cause instanceof Error ? cause.message : 'Tente novamente.');
    } finally { submitting.current = false; setBusy(false); }
  };
  const cancelOrder = (order: Order) => Alert.alert('Cancelar pedido?', 'O pedido será retirado da lista de compras e não poderá ser reaberto.',
    [{ text: 'Voltar', style: 'cancel' }, { text: 'Cancelar pedido', style: 'destructive', onPress: () => void mutate(() => updateOrderStatus(order.id, 'cancelled', order.version)) }]);
  const finishDelivery = () => {
    if (!deliveryDraft) return;
    const items = deliveryDraft.items.map(item => ({ id: item.id, missingQuantity: Number((item.missing || '0').replace(',', '.')), carryForward: item.carryForward }));
    if (items.some((item, index) => !Number.isFinite(item.missingQuantity) || item.missingQuantity < 0 || item.missingQuantity > deliveryDraft.items[index].quantity)) {
      return Alert.alert('Confira as faltas', 'A quantidade faltante deve estar entre zero e a quantidade pedida.');
    }
    const carried = deliveryDraft.items.filter((item, index) => items[index].missingQuantity > 0 && item.carryForward);
    const discarded = deliveryDraft.items.filter((item, index) => items[index].missingQuantity > 0 && !item.carryForward);
    const details = [carried.length ? `${carried.length} falta(s) irão para o próximo pedido.` : '', discarded.length ? `${discarded.length} falta(s) serão encerradas.` : ''].filter(Boolean).join('\n');
    Alert.alert('Concluir entrega?', details || 'Todos os produtos foram entregues.', [
      { text: 'Revisar', style: 'cancel' },
      { text: 'Concluir', onPress: () => void mutate(() => deliverOrder(deliveryDraft.order.id, { version: deliveryDraft.order.version, items })) },
    ]);
  };
  const save = () => {
    if (!draft) return;
    const items = draft.items.map((item) => ({ id: item.id, quantity: Number(item.input.replace(',', '.')) }));
    if (!items.length || items.some((item) => !Number.isFinite(item.quantity) || item.quantity <= 0)) return Alert.alert('Confira as quantidades', 'Mantenha pelo menos um produto, com quantidade maior que zero.');
    if (draft.date !== draft.order.deliveryDate.slice(0, 10) && draft.date < todayInSaoPaulo()) return Alert.alert('Data inválida', 'Escolha hoje ou uma data futura.');
    void mutate(() => editOrder(draft.order.id, { version: draft.order.version, ...(draft.date !== draft.order.deliveryDate.slice(0, 10) ? { deliveryDate: draft.date } : {}), items }), draft.date);
  };
  return <SafeAreaView style={styles.screen} edges={['top']}>
    <ScreenHeader title="Pedidos" subtitle={`${orders.length} pedidos na data selecionada`} />
    <DeliveryDateSelector date={date} onChange={setDate} onRefresh={refresh} />
    <FlatList data={orders} keyExtractor={(item) => item.id} contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />}
      ListEmptyComponent={<StateView loading={loading} error={error} empty={!loading && !error ? 'Nenhum pedido nesta data' : undefined} onRetry={refresh} />}
      renderItem={({ item }) => {
        const open = expanded === item.id;
        return <View style={styles.card}>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setExpanded(open ? null : item.id)} style={styles.row}><View style={styles.avatar}><Text style={styles.avatarText}>{item.client.name[0]?.toUpperCase()}</Text></View><View style={styles.copy}><Text style={styles.name}>{item.client.name}</Text><Text style={styles.meta}>{item.items.length} produtos · {labels[item.status] || item.status}</Text></View><Ionicons name={open ? 'chevron-up' : 'chevron-down'} color={colors.muted} size={19} /></TouchableOpacity>
          {open && <View style={styles.items}>{item.items.map((product) => <View key={product.id} style={styles.item}><Text style={styles.itemName}>{product.productName}</Text><Text style={styles.quantity}>{product.quantity} {product.unit}</Text></View>)}
            {!!item.originatedBackorders?.length && <View style={styles.carryNotice}><Ionicons name="alert-circle-outline" color={colors.danger} size={18} /><View style={styles.switchCopy}><Text style={styles.itemName}>Faltas registradas</Text>{item.originatedBackorders.map(backorder => <Text key={backorder.id} style={styles.meta}>{backorder.quantity} {backorder.unit} de {backorder.productName} · {backorder.status === 'pending' ? 'aguardando pedido' : 'transferido'}</Text>)}</View></View>}
            {!!item.receivedBackorders?.length && <View style={styles.carryNotice}><Ionicons name="return-down-forward-outline" color={colors.primary} size={18} /><Text style={styles.carryText}>Inclui {item.receivedBackorders.length} pendência(s) de entrega anterior.</Text></View>}
            {item.status === 'pending' && <TouchableOpacity disabled={busy} style={styles.primary} onPress={() => setDeliveryDraft({ order: item, items: item.items.map(product => ({ ...product, missing: '0', carryForward: false })) })}><Ionicons name="checkmark-circle-outline" color={colors.background} size={20} /><Text style={styles.primaryText}>Conferir e entregar</Text></TouchableOpacity>}
            <View style={styles.actions}>
              {item.status === 'pending' && <TouchableOpacity disabled={busy} style={styles.button} onPress={() => setDraft({ order: item, date: item.deliveryDate.slice(0, 10), items: item.items.map((product) => ({ ...product, input: String(product.quantity) })) })}><Text style={styles.actionText}>Editar</Text></TouchableOpacity>}
              {item.status === 'pending' && <TouchableOpacity disabled={busy} style={styles.button} onPress={() => cancelOrder(item)}><Text style={styles.danger}>Cancelar</Text></TouchableOpacity>}
              <TouchableOpacity style={styles.button} onPress={() => setHistoryId(historyId === item.id ? null : item.id)}><Text style={styles.actionText}>Histórico</Text></TouchableOpacity>
            </View>
            {historyId === item.id && <View style={styles.items}>
              {!item.history?.length && <Text style={styles.meta}>Nenhuma alteração registrada.</Text>}
              {item.history?.map((event) => <View key={event.id} style={styles.historyEvent}><Text style={styles.itemName}>{event.action === 'delivered' ? 'Entrega concluída' : event.action === 'status_changed' ? 'Pedido cancelado' : event.action === 'edited' ? 'Itens ou data editados' : event.action === 'pricing_changed' ? 'Preços alterados' : 'Pedido registrado'}</Text>{describeChanges(event).map((change, index) => <Text key={index} style={styles.meta}>{change}</Text>)}<Text style={styles.meta}>{new Date(event.createdAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · {event.actor === 'whatsapp' ? 'WhatsApp' : 'Aplicativo'}</Text></View>)}
            </View>}
          </View>}
        </View>;
      }} />
    <Modal visible={!!draft} animationType="slide" onRequestClose={() => !busy && setDraft(null)}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.modalHeader}><Text style={styles.name}>Editar pedido</Text><TouchableOpacity disabled={busy} style={styles.button} onPress={() => setDraft(null)}><Text style={styles.actionText}>Fechar</Text></TouchableOpacity></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
          {draft && <><Text style={styles.name}>{draft.order.client.name}</Text><DeliveryDateSelector date={draft.date} onChange={(value) => setDraft({ ...draft, date: value })} />
            {draft.items.map((item) => <View key={item.id} style={styles.card}><Text style={styles.name}>{item.productName}</Text><View style={styles.actions}><TextInput accessibilityLabel={`Quantidade de ${item.productName}`} editable={!busy} style={styles.input} value={item.input} keyboardType="decimal-pad" onChangeText={(input) => setDraft({ ...draft, items: draft.items.map((current) => current.id === item.id ? { ...current, input } : current) })} /><Text style={styles.meta}>{item.unit}</Text><TouchableOpacity disabled={busy} style={styles.button} onPress={() => setDraft({ ...draft, items: draft.items.filter((current) => current.id !== item.id) })}><Text style={styles.danger}>Remover</Text></TouchableOpacity></View></View>)}
            <TouchableOpacity disabled={busy} style={styles.primary} onPress={save}><Text style={styles.primaryText}>{busy ? 'Salvando…' : 'Salvar alterações'}</Text></TouchableOpacity></>}
        </ScrollView>
      </SafeAreaView>
    </Modal>
    <Modal visible={!!deliveryDraft} animationType="slide" onRequestClose={() => !busy && setDeliveryDraft(null)}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.modalHeader}><View><Text style={styles.name}>Conferir entrega</Text><Text style={styles.meta}>{deliveryDraft?.order.client.name}</Text></View><TouchableOpacity disabled={busy} style={styles.button} onPress={() => setDeliveryDraft(null)}><Text style={styles.actionText}>Fechar</Text></TouchableOpacity></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
          <View style={styles.instructions}><Ionicons name="information-circle-outline" color={colors.primary} size={21} /><Text style={styles.instructionText}>Informe somente o que faltou. Use zero quando o item foi entregue por completo.</Text></View>
          {deliveryDraft?.items.map(item => {
            const missing = Number((item.missing || '0').replace(',', '.'));
            const hasMissing = Number.isFinite(missing) && missing > 0;
            return <View key={item.id} style={styles.card}><View style={styles.item}><Text style={styles.name}>{item.productName}</Text><Text style={styles.quantity}>Pedido: {item.quantity} {item.unit}</Text></View>
              <Text style={styles.fieldLabel}>Quantidade que faltou</Text>
              <View style={styles.actions}><TextInput accessibilityLabel={`Quantidade faltante de ${item.productName}`} editable={!busy} style={styles.input} value={item.missing} keyboardType="decimal-pad" onChangeText={missingValue => setDeliveryDraft({ ...deliveryDraft, items: deliveryDraft.items.map(current => current.id === item.id ? { ...current, missing: missingValue, carryForward: Number(missingValue.replace(',', '.')) > 0 ? current.carryForward : false } : current) })} /><Text style={styles.meta}>{item.unit}</Text>{hasMissing && <Ionicons name="alert-circle" color={colors.danger} size={21} />}</View>
              {hasMissing && <View style={styles.switchRow}><View style={styles.switchCopy}><Text style={styles.itemName}>Levar para o próximo pedido?</Text><Text style={styles.meta}>Entrará automaticamente e será precificado na próxima entrega.</Text></View><Switch value={item.carryForward} onValueChange={carryForward => setDeliveryDraft({ ...deliveryDraft, items: deliveryDraft.items.map(current => current.id === item.id ? { ...current, carryForward } : current) })} trackColor={{ false: colors.border, true: colors.primarySoft }} thumbColor={item.carryForward ? colors.primary : colors.muted} /></View>}
            </View>;
          })}
          <TouchableOpacity disabled={busy} style={styles.primary} onPress={finishDelivery}><Ionicons name="checkmark-circle" color={colors.background} size={20} /><Text style={styles.primaryText}>{busy ? 'Concluindo…' : 'Concluir entrega'}</Text></TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}
const createStyles = (colors: ThemeColors) => ({
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }, button: { padding: 12, minHeight: 44 }, actionText: { color: colors.primary, fontWeight: '700' }, danger: { color: colors.danger, fontWeight: '700' }, primary: { backgroundColor: colors.primary, borderRadius: 10, padding: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 10 }, primaryText: { color: colors.background, fontWeight: '800' }, historyEvent: { paddingVertical: 8 }, modalHeader: { paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, input: { minWidth: 80, minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, color: colors.text, backgroundColor: colors.input },
  instructions: { flexDirection: 'row', gap: 10, padding: 13, borderRadius: 12, backgroundColor: colors.primarySoft }, instructionText: { flex: 1, color: colors.text, lineHeight: 19 }, fieldLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 5 }, switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }, switchCopy: { flex: 1 }, carryNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primarySoft, padding: 10, borderRadius: 10, marginTop: 8 }, carryText: { flex: 1, color: colors.text, fontSize: 12, fontWeight: '600' },
  screen: { flex: 1, backgroundColor: colors.background }, list: { padding: 16, paddingBottom: 30, gap: 10 }, card: { backgroundColor: colors.surface, borderRadius: 15, padding: 15, ...shadows.card }, row: { flexDirection: 'row', alignItems: 'center' }, avatar: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.primarySoft, justifyContent: 'center', alignItems: 'center' }, avatarText: { color: colors.primary, fontSize: 17, fontWeight: '800' }, copy: { flex: 1, marginLeft: 12 }, name: { color: colors.text, fontSize: 16, fontWeight: '700' }, meta: { color: colors.muted, fontSize: 12, marginTop: 3 }, items: { marginTop: 14, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }, item: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }, itemName: { color: colors.text }, quantity: { color: colors.primary, fontWeight: '700' },
});
