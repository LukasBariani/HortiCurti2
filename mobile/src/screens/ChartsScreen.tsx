import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Dimensions, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import StateView from '../components/StateView';
import { getDashboardData } from '../services/api';
import { shadows, ThemeColors, useTheme, useThemedStyles } from '../theme';
import { formatDeliveryDate, todayInSaoPaulo } from '../utils/deliveryDate';

interface Dashboard {
  period: { startDate: string; endDate: string; days: number };
  totals: { revenue: number; cost: number; profit: number; orders: number; averageTicket: number; margin: number; pricedItems: number; unpricedItems: number; pricedOrders: number };
  daily: { date: string; revenue: number; profit: number; orders: number }[];
  topProducts: { productName: string; revenue: number; profit: number }[];
  recentOrders: { id: string; clientName: string; deliveryDate: string; deliveredAt: string; itemCount: number; revenue: number; profit: number; isFullyPriced: boolean }[];
}
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const chartWidth = Math.max(250, Dimensions.get('window').width - 76);

export default function ChartsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async (quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true);
    setError('');
    try { setData(await getDashboardData(days)); }
    catch { setError('Confira se o backend está conectado e tente novamente.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [days]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const daily = (data?.daily ?? []).filter((day) => day.orders > 0 || day.revenue > 0).slice(-14);
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Resumo" subtitle="Faturamento e lucro dos pedidos entregues." />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}>
        <View style={styles.periods}>{[7, 30, 90].map((period) => <TouchableOpacity key={period} onPress={() => setDays(period)} style={[styles.period, days === period && styles.periodActive]}><Text style={[styles.periodText, days === period && styles.periodTextActive]}>{period} dias</Text></TouchableOpacity>)}</View>
        {loading && !data ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View> : error ? <StateView error={error} onRetry={() => load()} /> : data && <>
          <View style={styles.metrics}>
            <Metric label="Faturamento" value={money(data.totals.revenue)} accent />
            <Metric label="Lucro" value={money(data.totals.profit)} />
            <Metric label="Pedidos entregues" value={String(data.totals.orders)} />
            <Metric label="Ticket precificado" value={money(data.totals.averageTicket)} />
          </View>
          {data.totals.unpricedItems > 0 && <View style={styles.notice}><Text style={styles.noticeTitle}>{data.totals.unpricedItems} itens ainda sem preço</Text><Text style={styles.noticeText}>Os valores do resumo consideram somente itens precificados.</Text></View>}
          <Section title="Evolução financeira" subtitle="Faturamento e lucro por dia da entrega efetiva">
            {daily.length ? <LineChart width={chartWidth} height={180} data={daily.map((d) => ({ value: d.revenue, label: d.date.slice(5).split('-').reverse().join('/') }))} data2={daily.map((d) => ({ value: d.profit }))} color={colors.primary} color2={colors.blue} thickness={3} hideRules yAxisTextStyle={styles.chartLabel} xAxisLabelTextStyle={styles.chartLabel} noOfSections={4} isAnimated /> : <Text style={styles.empty}>Sem valores precificados neste período.</Text>}
            {!!daily.length && <View style={styles.legend}><Legend color={colors.primary} label="Faturamento" /><Legend color={colors.blue} label="Lucro" /></View>}
          </Section>
          <Section title="Produtos em destaque" subtitle="Ordenados por faturamento">
            {data.topProducts.length ? <BarChart width={chartWidth} height={170} data={data.topProducts.map((p) => ({ value: p.revenue, label: p.productName.split(' ')[0], frontColor: colors.primary }))} hideRules yAxisTextStyle={styles.chartLabel} xAxisLabelTextStyle={styles.chartLabel} noOfSections={4} barWidth={24} spacing={24} roundedTop /> : <Text style={styles.empty}>Precifique os produtos para ver este gráfico.</Text>}
          </Section>
          <Section title="Pedidos recentes" subtitle="Últimas entregas do período">
            {data.recentOrders.map((order) => <View key={order.id} style={styles.orderRow}><View style={styles.orderCopy}><Text style={styles.orderName}>{order.clientName}</Text><Text style={styles.orderMeta}>{formatDeliveryDate(todayInSaoPaulo(new Date(order.deliveredAt)))} · {order.itemCount} {order.itemCount === 1 ? 'item' : 'itens'}</Text></View><View><Text style={styles.orderValue}>{order.isFullyPriced ? money(order.revenue) : 'Pendente'}</Text><Text style={styles.orderProfit}>{order.isFullyPriced ? `Lucro ${money(order.profit)}` : 'Falta precificar'}</Text></View></View>)}
          </Section>
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}
function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) { const styles = useThemedStyles(createStyles); return <View style={[styles.metric, accent && styles.metricAccent]}><Text style={[styles.metricLabel, accent && styles.metricLabelAccent]}>{label}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={[styles.metricValue, accent && styles.metricValueAccent]}>{value}</Text></View>; }
function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { const styles = useThemedStyles(createStyles); return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionSubtitle}>{subtitle}</Text><View style={styles.sectionBody}>{children}</View></View>; }
function Legend({ color, label }: { color: string; label: string }) { const styles = useThemedStyles(createStyles); return <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: color }]} /><Text style={styles.legendText}>{label}</Text></View>; }
const createStyles = (colors: ThemeColors) => ({
  screen: { flex: 1, backgroundColor: colors.background }, content: { padding: 16, paddingBottom: 32, gap: 14 }, loading: { padding: 60 },
  periods: { flexDirection: 'row', backgroundColor: colors.surface, padding: 4, borderRadius: 12, alignSelf: 'flex-start' }, period: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 9 }, periodActive: { backgroundColor: colors.primary }, periodText: { color: colors.muted, fontWeight: '700' }, periodTextActive: { color: '#FFF' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, metric: { width: '48%', backgroundColor: colors.surface, borderRadius: 14, padding: 15, ...shadows.card }, metricAccent: { backgroundColor: colors.primary }, metricLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' }, metricLabelAccent: { color: '#CFE6D8' }, metricValue: { color: colors.text, fontSize: 21, fontWeight: '800', marginTop: 7 }, metricValueAccent: { color: '#FFF' },
  notice: { backgroundColor: colors.warningSoft, padding: 14, borderRadius: 12 }, noticeTitle: { color: colors.warning, fontWeight: '800' }, noticeText: { color: colors.muted, marginTop: 3, lineHeight: 19 },
  section: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, ...shadows.card }, sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800' }, sectionSubtitle: { color: colors.muted, fontSize: 12, marginTop: 3 }, sectionBody: { marginTop: 18, overflow: 'hidden' }, chartLabel: { color: colors.muted, fontSize: 10 }, legend: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 10 }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 }, dot: { width: 8, height: 8, borderRadius: 4 }, legendText: { color: colors.muted, fontSize: 12 }, empty: { color: colors.muted, textAlign: 'center', padding: 24 },
  orderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, orderCopy: { flex: 1 }, orderName: { color: colors.text, fontWeight: '700' }, orderMeta: { color: colors.muted, fontSize: 12, marginTop: 3 }, orderValue: { color: colors.text, fontWeight: '800', textAlign: 'right' }, orderProfit: { color: colors.primary, fontSize: 11, marginTop: 3, textAlign: 'right' },
});
