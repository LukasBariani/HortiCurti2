import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DeliveryDateSelector from '../components/DeliveryDateSelector';
import ScreenHeader from '../components/ScreenHeader';
import StateView from '../components/StateView';
import { useDeliveryData } from '../hooks/useDeliveryData';
import { getListaConsolidada } from '../services/api';
import { shadows, ThemeColors, useTheme, useThemedStyles } from '../theme';
import { productUnitKey } from '../utils/deliveryDate';

interface ClientItem { clientName: string; quantity: number }
interface Item { productName: string; totalQuantity: number; unit: string; clients: ClientItem[]; checked?: boolean }
async function loadList(date: string): Promise<Item[]> {
  const [data, saved] = await Promise.all([getListaConsolidada(date), AsyncStorage.getItem(`@checked_items:${date}`)]);
  let checked: Record<string, boolean> = {};
  try { checked = JSON.parse(saved ?? '{}') ?? {}; } catch {}
  return data.map((item: any) => ({ productName: item.productName, totalQuantity: item.totalQuantity, unit: item.unit,
    clients: (item.clientes ?? []).map((client: any) => ({ clientName: client.nome, quantity: client.quantidade })), checked: !!checked[productUnitKey(item)] }));
}
export default function ListaDiaScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { date, setDate, data: items, setData: setItems, loading, error, refresh } = useDeliveryData<Item>(loadList);
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => setExpanded(null), [date]);
  const done = items.filter((item) => item.checked).length;
  const toggle = async (target: Item) => {
    const key = productUnitKey(target);
    const next = items.map((item) => productUnitKey(item) === key ? { ...item, checked: !item.checked } : item);
    setItems(next);
    const state = Object.fromEntries(next.filter((item) => item.checked).map((item) => [productUnitKey(item), true]));
    await AsyncStorage.setItem(`@checked_items:${date}`, JSON.stringify(state));
  };
  return <SafeAreaView style={styles.screen} edges={['top']}>
    <ScreenHeader title="Lista de compras" subtitle={`${done} de ${items.length} produtos separados`} />
    <DeliveryDateSelector date={date} onChange={setDate} onRefresh={refresh} />
    {!!items.length && <View style={styles.progress}><View style={[styles.progressFill, { width: `${done / items.length * 100}%` }]} /></View>}
    <FlatList data={items} keyExtractor={productUnitKey} contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />}
      ListEmptyComponent={<StateView loading={loading} error={error} empty={!loading && !error ? 'Lista livre nesta data' : undefined} onRetry={refresh} />}
      renderItem={({ item }) => { const key = productUnitKey(item); const open = expanded === key; return <View style={[styles.card, item.checked && styles.cardDone]}>
        <View style={styles.row}><TouchableOpacity accessibilityLabel={item.checked ? 'Desmarcar produto' : 'Marcar produto'} onPress={() => toggle(item)} style={[styles.check, item.checked && styles.checkDone]}><Ionicons name={item.checked ? 'checkmark' : 'ellipse-outline'} size={20} color={item.checked ? '#FFF' : colors.muted} /></TouchableOpacity><TouchableOpacity style={styles.copy} onPress={() => setExpanded(open ? null : key)}><Text style={[styles.name, item.checked && styles.nameDone]}>{item.productName}</Text><Text style={styles.meta}>{item.clients.length} {item.clients.length === 1 ? 'cliente' : 'clientes'}</Text></TouchableOpacity><View style={styles.amount}><Text style={styles.quantity}>{item.totalQuantity}</Text><Text style={styles.unit}>{item.unit}</Text></View></View>
        {open && <View style={styles.clients}>{item.clients.map((client, index) => <View key={`${client.clientName}-${index}`} style={styles.client}><Text style={styles.clientName}>{client.clientName}</Text><Text style={styles.clientQty}>{client.quantity} {item.unit}</Text></View>)}</View>}
      </View>; }} />
  </SafeAreaView>;
}
const createStyles = (colors: ThemeColors) => ({
  screen: { flex: 1, backgroundColor: colors.background }, progress: { height: 4, backgroundColor: colors.border }, progressFill: { height: 4, backgroundColor: colors.primary }, list: { padding: 16, paddingBottom: 30, gap: 10 }, card: { backgroundColor: colors.surface, borderRadius: 15, padding: 15, ...shadows.card }, cardDone: { backgroundColor: colors.primarySoft, opacity: 0.75 }, row: { flexDirection: 'row', alignItems: 'center' }, check: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }, checkDone: { backgroundColor: colors.primary }, copy: { flex: 1, marginLeft: 12 }, name: { color: colors.text, fontWeight: '700', fontSize: 16 }, nameDone: { textDecorationLine: 'line-through', color: colors.muted }, meta: { color: colors.muted, fontSize: 12, marginTop: 3 }, amount: { alignItems: 'flex-end' }, quantity: { color: colors.primary, fontSize: 20, fontWeight: '800' }, unit: { color: colors.muted, fontSize: 11 }, clients: { marginTop: 12, paddingTop: 7, borderTopWidth: 1, borderTopColor: colors.border }, client: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 }, clientName: { color: colors.muted, flex: 1 }, clientQty: { color: colors.text, fontWeight: '600' },
});
