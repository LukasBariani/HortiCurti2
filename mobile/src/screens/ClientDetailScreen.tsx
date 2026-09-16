import React, { useCallback, useState } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import StateView from '../components/StateView';
import { getClientInfo, getClientOrders } from '../services/api';
import { shadows, ThemeColors, useTheme, useThemedStyles } from '../theme';
import { formatDeliveryDate } from '../utils/deliveryDate';

export default function ClientDetailScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { clientId } = route.params;
  const [client, setClient] = useState<any>(null); const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { const [info, history] = await Promise.all([getClientInfo(clientId), getClientOrders(clientId)]); setClient(info); setOrders(history); } catch { setError('Não foi possível carregar o histórico deste cliente.'); } finally { setLoading(false); } }, [clientId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (!client) return <SafeAreaView style={styles.screen} edges={['top']}><StateView loading={loading} error={error} onRetry={load} /></SafeAreaView>;
  return <SafeAreaView style={styles.screen} edges={['top']}><View style={styles.header}><TouchableOpacity accessibilityLabel="Voltar" onPress={() => navigation.goBack()} style={styles.back}><Ionicons name="arrow-back" size={22} color={colors.text} /></TouchableOpacity><Text style={styles.headerTitle}>Detalhes do cliente</Text></View><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}><View style={styles.profile}><View style={styles.avatar}><Text style={styles.avatarText}>{client.name[0]?.toUpperCase()}</Text></View><Text style={styles.name}>{client.name}</Text><Text style={styles.phone}>{client.whatsappNumber}</Text><TouchableOpacity onPress={() => Linking.openURL(`https://wa.me/${client.whatsappNumber.replace(/\D/g, '')}`)} style={styles.whatsapp}><Ionicons name="logo-whatsapp" size={18} color="#FFF" /><Text style={styles.whatsappText}>Abrir WhatsApp</Text></TouchableOpacity></View><Text style={styles.sectionTitle}>Histórico de pedidos</Text>{orders.length ? orders.map((order) => <View key={order.id} style={styles.order}><View><Text style={styles.orderDate}>Entrega em {formatDeliveryDate(order.deliveryDate)}</Text><Text style={styles.orderMeta}>{order.items.length} {order.items.length === 1 ? 'produto' : 'produtos'}</Text></View><Ionicons name="receipt-outline" size={21} color={colors.primary} /></View>) : <Text style={styles.empty}>Este cliente ainda não tem pedidos.</Text>}</ScrollView></SafeAreaView>;
}
const createStyles = (colors: ThemeColors) => ({
  screen: { flex: 1, backgroundColor: colors.background }, header: { height: 62, paddingHorizontal: 16, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border }, back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }, headerTitle: { color: colors.text, fontWeight: '800', fontSize: 18, marginLeft: 8 }, content: { padding: 16, paddingBottom: 32 }, profile: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 18, padding: 22, ...shadows.card }, avatar: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.primarySoft, justifyContent: 'center', alignItems: 'center' }, avatarText: { color: colors.primary, fontSize: 27, fontWeight: '800' }, name: { color: colors.text, fontSize: 21, fontWeight: '800', marginTop: 12, textAlign: 'center' }, phone: { color: colors.muted, marginTop: 5 }, whatsapp: { marginTop: 16, backgroundColor: colors.primary, borderRadius: 11, paddingHorizontal: 18, paddingVertical: 11, flexDirection: 'row', gap: 8, alignItems: 'center' }, whatsappText: { color: '#FFF', fontWeight: '700' }, sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800', marginTop: 24, marginBottom: 10 }, order: { backgroundColor: colors.surface, padding: 15, borderRadius: 14, marginBottom: 9, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, orderDate: { color: colors.text, fontWeight: '700' }, orderMeta: { color: colors.muted, fontSize: 12, marginTop: 3 }, empty: { color: colors.muted, textAlign: 'center', padding: 28 },
});
