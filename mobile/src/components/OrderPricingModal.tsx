import React, { useRef, useState } from 'react';
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OrderMutationError, priceOrder } from '../services/api';
import { parseMarkup } from '../utils/markup';
import { ThemeColors, useThemedStyles } from '../theme';

export interface PricingOrder {
  id: string; version: number; pricingMarkupPercent?: number | null;
  client: { name: string; defaultMarkupPercent?: number | null };
  items: { id: string; productName: string; quantity: number; unit: string; costPrice?: number | null; salePrice?: number | null }[];
}
const money = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const number = (s: string) => { try { return parseMarkup(s); } catch { return null; } };
export default function OrderPricingModal({ order, onClose, onSaved }: { order: PricingOrder; onClose: () => void; onSaved: () => Promise<void> }) {
  const styles = useThemedStyles(createStyles);
  const [markup, setMarkup] = useState(String(order.pricingMarkupPercent ?? order.client.defaultMarkupPercent ?? '').replace('.', ','));
  const [items, setItems] = useState(order.items.map(item => ({ ...item, cost: item.costPrice == null ? '' : String(item.costPrice), sale: item.salePrice == null ? '' : String(item.salePrice), manual: item.salePrice != null })));
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const percent = number(markup);
  const preview = items.map(item => {
    const cost = number(item.cost);
    const sale = item.manual ? number(item.sale) : cost != null && percent != null ? Math.round((cost * (1 + percent / 100) + Number.EPSILON) * 100) / 100 : null;
    return { ...item, costValue: cost, saleValue: sale };
  });
  const complete = percent != null && preview.every(i => i.costValue != null && i.saleValue != null && Number.isFinite(i.saleValue));
  const costTotal = preview.reduce((sum, i) => sum + (i.costValue ?? 0) * i.quantity, 0);
  const saleTotal = preview.reduce((sum, i) => sum + (i.saleValue ?? 0) * i.quantity, 0);
  const save = async () => {
    if (lock.current) return;
    if (!complete) return Alert.alert('Confira os valores', 'Preencha o percentual e o custo de todos os produtos.');
    lock.current = true; setBusy(true);
    try {
      await priceOrder(order.id, { version: order.version, markupPercent: percent!, items: preview.map(i => ({ id: i.id, costPrice: i.costValue!, ...(i.manual ? { salePrice: i.saleValue! } : {}) })) });
      await onSaved(); onClose();
    } catch (error) {
      if (error instanceof OrderMutationError && error.status === 409) { await onSaved(); onClose(); }
      Alert.alert('Não foi possível salvar', error instanceof Error ? error.message : 'Tente novamente.');
    } finally { lock.current = false; setBusy(false); }
  };
  return <Modal visible animationType="slide" onRequestClose={() => !busy && onClose()}><SafeAreaView style={styles.screen}>
    <View style={styles.header}><Text style={styles.title}>Precificar pedido</Text><TouchableOpacity disabled={busy} onPress={onClose} style={styles.link}><Text style={styles.linkText}>Fechar</Text></TouchableOpacity></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <Text style={styles.title}>{order.client.name}</Text>
      <View style={styles.card}><Text style={styles.label}>Acréscimo sobre o custo (%)</Text>
        <Text style={styles.muted}>{order.client.defaultMarkupPercent == null ? 'Cliente sem percentual padrão' : `Padrão do cliente: ${order.client.defaultMarkupPercent}%`}</Text>
        <TextInput accessibilityLabel="Acréscimo do pedido em porcentagem" editable={!busy} keyboardType="decimal-pad" value={markup} onChangeText={setMarkup} placeholder="Ex.: 40" style={styles.input} />
        <TouchableOpacity disabled={busy} style={styles.link} onPress={() => { if (percent == null) return Alert.alert('Informe o percentual'); Alert.alert('Recalcular todos os preços?', 'Os ajustes individuais serão substituídos pelo percentual informado.', [{ text: 'Voltar', style: 'cancel' }, { text: 'Aplicar', onPress: () => setItems(current => current.map(i => ({ ...i, manual: false }))) }]); }}><Text style={styles.linkText}>Aplicar percentual a todos os itens</Text></TouchableOpacity>
      </View>
      {preview.map(item => <View key={item.id} style={styles.card}>
        <Text style={styles.title}>{item.productName}</Text><Text style={styles.muted}>{item.quantity} {item.unit}</Text>
        <Text style={styles.label}>Custo por {item.unit} (R$)</Text><TextInput editable={!busy} accessibilityLabel={`Custo de ${item.productName}`} keyboardType="decimal-pad" value={item.cost} style={styles.input} onChangeText={cost => setItems(current => current.map(i => i.id === item.id ? { ...i, cost } : i))} />
        <Text style={styles.label}>Venda por {item.unit} (R$){item.manual ? ' · ajustada' : ' · automática'}</Text>
        <TextInput editable={!busy} accessibilityLabel={`Venda de ${item.productName}`} keyboardType="decimal-pad" value={item.manual ? item.sale : item.saleValue == null ? '' : item.saleValue.toFixed(2)} style={styles.input} onChangeText={sale => setItems(current => current.map(i => i.id === item.id ? { ...i, sale, manual: true } : i))} />
        {item.manual && <TouchableOpacity disabled={busy} style={styles.link} onPress={() => setItems(current => current.map(i => i.id === item.id ? { ...i, manual: false } : i))}><Text style={styles.linkText}>Usar percentual do pedido</Text></TouchableOpacity>}
        <Text style={styles.muted}>Subtotal: {item.saleValue == null ? '—' : money(item.saleValue * item.quantity)}</Text>
      </View>)}
      <View style={styles.card}><Text style={styles.label}>{complete ? 'Resumo do pedido' : 'Resumo parcial · faltam valores'}</Text><Text style={styles.muted}>Custo: {money(costTotal)}</Text><Text style={styles.title}>Venda: {money(saleTotal)}</Text><Text style={styles.muted}>Lucro bruto: {money(saleTotal - costTotal)}</Text></View>
      <TouchableOpacity disabled={busy || !complete} onPress={save} style={[styles.save, (!complete || busy) && { opacity: 0.5 }]}><Text style={styles.saveText}>{busy ? 'Salvando…' : 'Salvar precificação'}</Text></TouchableOpacity>
    </ScrollView>
  </SafeAreaView></Modal>;
}
const createStyles = (colors: ThemeColors) => ({
  screen: { flex: 1, backgroundColor: colors.background }, header: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, content: { padding: 16, gap: 12 }, card: { padding: 16, borderRadius: 14, backgroundColor: colors.surface }, title: { fontSize: 17, fontWeight: '700', color: colors.text }, muted: { color: colors.muted, marginTop: 5 }, label: { color: colors.text, fontWeight: '600', marginTop: 10 }, input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.text, backgroundColor: colors.input, marginTop: 8 }, link: { paddingVertical: 12 }, linkText: { color: colors.primary, fontWeight: '700' }, save: { padding: 16, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' }, saveText: { color: '#fff', fontWeight: '700' },
});
