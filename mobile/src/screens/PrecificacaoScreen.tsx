import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DeliveryDateSelector from '../components/DeliveryDateSelector';
import ScreenHeader from '../components/ScreenHeader';
import StateView from '../components/StateView';
import { getListaConsolidada, updateOrderItemPricing } from '../services/api';
import { ThemeColors, useTheme, useThemedStyles } from '../theme';
import { todayInSaoPaulo } from '../utils/deliveryDate';

type MarginMode = 'percentage' | 'amount';
interface PricingItem { productName: string; totalQuantity: number; unit: string; itemIds: string[]; cost: string; margin: string; profit: string; sale: number }

const parseNumber = (value: string) => value.trim() === '' ? Number.NaN : Number(value.replace(',', '.'));
const sanitizeNumber = (value: string) => value.replace(/[^0-9,.]/g, '');
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function PrecificacaoScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [date, setDate] = useState(todayInSaoPaulo);
  const [mode, setMode] = useState<MarginMode>('percentage');
  const [items, setItems] = useState<PricingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await getListaConsolidada(date);
      setItems(data.map((item: any) => {
        const cost = item.costPrice == null ? '' : String(item.costPrice);
        const margin = item.margin == null ? '30' : String(item.margin);
        const costValue = parseNumber(cost), marginValue = parseNumber(margin);
        const profit = Number.isFinite(costValue) && Number.isFinite(marginValue) ? (costValue * marginValue / 100).toFixed(2) : '';
        return { ...item, cost, margin, profit, sale: item.salePrice ?? 0 };
      }));
    } catch { setError('Não foi possível carregar os produtos desta data.'); }
    finally { setLoading(false); }
  }, [date]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const change = (index: number, field: 'cost' | 'margin' | 'profit', rawValue: string) => {
    const value = sanitizeNumber(rawValue);
    setItems((current) => current.map((item, position) => {
      if (position !== index) return item;
      const updated = { ...item, [field]: value };
      const cost = parseNumber(updated.cost);
      let margin = parseNumber(updated.margin), profit = parseNumber(updated.profit);
      if (mode === 'percentage') {
        profit = Number.isFinite(cost) && Number.isFinite(margin) ? cost * margin / 100 : Number.NaN;
        updated.profit = Number.isFinite(profit) ? profit.toFixed(2) : '';
      } else {
        margin = Number.isFinite(cost) && cost > 0 && Number.isFinite(profit) ? profit / cost * 100 : Number.NaN;
        updated.margin = Number.isFinite(margin) ? margin.toFixed(2) : '';
      }
      updated.sale = Number.isFinite(cost) && Number.isFinite(profit) ? cost + profit : 0;
      return updated;
    }));
  };

  const save = async () => {
    const valid = items.filter((item) => {
      const cost = parseNumber(item.cost), margin = parseNumber(item.margin);
      return cost > 0 && margin >= 0 && Number.isFinite(cost) && Number.isFinite(margin);
    });
    if (!valid.length) return Alert.alert('Preços incompletos', `Preencha custo e ${mode === 'percentage' ? 'margem' : 'lucro'} de pelo menos um produto.`);
    setSaving(true);
    try {
      await Promise.all(valid.flatMap((item) => item.itemIds.map((id) => updateOrderItemPricing(id, parseNumber(item.cost), parseNumber(item.margin)))));
      Alert.alert('Preços salvos', `${valid.length} produtos foram atualizados.`); await load();
    } catch { Alert.alert('Erro', 'Não foi possível salvar todos os preços. Tente novamente.'); }
    finally { setSaving(false); }
  };

  const priced = items.filter((item) => item.cost !== '').length;
  return <SafeAreaView style={styles.screen} edges={['top']}>
    <ScreenHeader title="Precificação" subtitle={`${priced} de ${items.length} produtos preenchidos`} action={<TouchableOpacity disabled={saving} onPress={save} style={styles.save}><Text style={styles.saveText}>{saving ? 'Salvando…' : 'Salvar'}</Text></TouchableOpacity>} />
    <DeliveryDateSelector date={date} onChange={setDate} onRefresh={load} />
    <View style={styles.modeSection}>
      <Text style={styles.modeTitle}>Como deseja informar o lucro?</Text>
      <View style={styles.segmentedControl}>
        {([['percentage', 'Margem %'], ['amount', 'Lucro R$']] as const).map(([value, label]) => <TouchableOpacity key={value} accessibilityRole="button" accessibilityState={{ selected: mode === value }} onPress={() => setMode(value)} style={[styles.modeButton, mode === value && styles.modeButtonActive]}><Text style={[styles.modeButtonText, mode === value && styles.modeButtonTextActive]}>{label}</Text></TouchableOpacity>)}
      </View>
    </View>
    <FlatList data={items} keyExtractor={(item) => `${item.productName}-${item.unit}`} contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
      ListEmptyComponent={<StateView loading={loading} error={error} empty={!loading && !error ? 'Nenhum produto nesta data' : undefined} onRetry={load} />}
      renderItem={({ item, index }) => {
        const margin = parseNumber(item.margin), profit = parseNumber(item.profit);
        return <View style={styles.card}>
          <View style={styles.heading}><View style={styles.productInfo}><Text style={styles.name}>{item.productName}</Text><Text style={styles.meta}>{item.totalQuantity} {item.unit}</Text></View>{item.sale > 0 && <View style={styles.sale}><Text style={styles.saleLabel}>Venda</Text><Text style={styles.saleValue}>{money(item.sale)}</Text></View>}</View>
          <View style={styles.fields}>
            <View style={styles.field}><Text style={styles.label}>Custo unitário</Text><View style={styles.inputWrap}><Text style={styles.prefix}>R$</Text><TextInput value={item.cost} onChangeText={(value) => change(index, 'cost', value)} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={colors.muted} style={styles.input} /></View></View>
            <View style={styles.field}><Text style={styles.label}>{mode === 'percentage' ? 'Margem de lucro' : 'Lucro unitário'}</Text><View style={styles.inputWrap}>{mode === 'amount' && <Text style={styles.prefix}>R$</Text>}<TextInput value={mode === 'percentage' ? item.margin : item.profit} onChangeText={(value) => change(index, mode === 'percentage' ? 'margin' : 'profit', value)} keyboardType="decimal-pad" placeholder={mode === 'percentage' ? '30' : '0,00'} placeholderTextColor={colors.muted} style={styles.input} />{mode === 'percentage' && <Text style={styles.prefix}>%</Text>}</View></View>
          </View>
          {item.sale > 0 && <Text style={styles.calculation}>{mode === 'percentage' ? `Lucro unitário: ${money(profit)}` : `Margem correspondente: ${margin.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`}</Text>}
        </View>;
      }} />
  </SafeAreaView>;
}

const createStyles = (colors: ThemeColors) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  save: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  saveText: { color: '#FFF', fontWeight: '800' as const },
  modeSection: { paddingHorizontal: 16, paddingTop: 12 },
  modeTitle: { color: colors.muted, fontSize: 12, fontWeight: '600' as const, marginBottom: 7 },
  segmentedControl: { flexDirection: 'row' as const, backgroundColor: colors.input, borderRadius: 11, borderWidth: 1, borderColor: colors.border, padding: 3 },
  modeButton: { flex: 1, alignItems: 'center' as const, paddingVertical: 9, borderRadius: 8 },
  modeButtonActive: { backgroundColor: colors.primary },
  modeButtonText: { color: colors.muted, fontSize: 13, fontWeight: '700' as const },
  modeButtonTextActive: { color: '#FFF' },
  list: { padding: 16, paddingBottom: 30, gap: 11 },
  card: { backgroundColor: colors.surface, borderRadius: 15, padding: 16, borderWidth: 1, borderColor: colors.border },
  heading: { flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 15 }, productInfo: { flex: 1 },
  name: { color: colors.text, fontWeight: '800' as const, fontSize: 16 }, meta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  sale: { backgroundColor: colors.primarySoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, alignItems: 'flex-end' as const }, saleLabel: { color: colors.muted, fontSize: 10 }, saleValue: { color: colors.primary, fontWeight: '800' as const, marginTop: 2 },
  fields: { flexDirection: 'row' as const, gap: 10 }, field: { flex: 1 }, label: { color: colors.muted, fontSize: 11, fontWeight: '600' as const, marginBottom: 6 },
  inputWrap: { flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 10 }, prefix: { color: colors.muted, fontWeight: '600' as const }, input: { flex: 1, color: colors.text, paddingVertical: 11, paddingHorizontal: 6, fontWeight: '700' as const },
  calculation: { color: colors.primary, fontSize: 12, fontWeight: '700' as const, marginTop: 11 },
});
