import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Modal, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import StateView from '../components/StateView';
import { createClient, getClients } from '../services/api';
import { shadows, ThemeColors, useTheme, useThemedStyles } from '../theme';

interface Client { id: string; name: string; whatsappNumber: string; createdAt: string }
export default function ClientesScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', whatsappNumber: '' });
  const load = useCallback(async () => { setLoading(true); setError(''); try { setClients(await getClients()); } catch { setError('Confira a conexão com o backend.'); } finally { setLoading(false); } }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const submit = async () => {
    const name = form.name.trim(), whatsappNumber = form.whatsappNumber.replace(/\D/g, '');
    if (!name || whatsappNumber.length < 10) return Alert.alert('Confira os dados', 'Informe o nome e um WhatsApp com DDD.');
    setSaving(true);
    try { await createClient({ name, whatsappNumber }); setOpen(false); setForm({ name: '', whatsappNumber: '' }); await load(); }
    catch { Alert.alert('Erro', 'Não foi possível cadastrar o cliente. Confira se o número já existe.'); }
    finally { setSaving(false); }
  };
  return <SafeAreaView style={styles.screen} edges={['top']}>
    <ScreenHeader title="Clientes" subtitle={`${clients.length} clientes cadastrados`} action={<TouchableOpacity accessibilityLabel="Adicionar cliente" onPress={() => setOpen(true)} style={styles.add}><Ionicons name="add" size={23} color="#FFF" /></TouchableOpacity>} />
    <FlatList data={clients} keyExtractor={(item) => item.id} contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
      ListEmptyComponent={<StateView loading={loading} error={error} empty={!loading && !error ? 'Nenhum cliente cadastrado' : undefined} onRetry={load} />}
      renderItem={({ item }) => <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ClientDetail', { clientId: item.id })}><View style={styles.avatar}><Text style={styles.avatarText}>{item.name[0]?.toUpperCase()}</Text></View><View style={styles.copy}><Text style={styles.name}>{item.name}</Text><Text style={styles.phone}>{item.whatsappNumber}</Text></View><Ionicons name="chevron-forward" size={20} color={colors.muted} /></TouchableOpacity>} />
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}><View style={styles.overlay}><View style={styles.sheet}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Novo cliente</Text><TouchableOpacity onPress={() => setOpen(false)}><Ionicons name="close" size={25} color={colors.muted} /></TouchableOpacity></View><Text style={styles.label}>Nome</Text><TextInput value={form.name} onChangeText={(name) => setForm({ ...form, name })} placeholder="Nome do estabelecimento" placeholderTextColor={colors.muted} style={styles.input} /><Text style={styles.label}>WhatsApp</Text><TextInput value={form.whatsappNumber} onChangeText={(whatsappNumber) => setForm({ ...form, whatsappNumber })} keyboardType="phone-pad" placeholder="DDD + número" placeholderTextColor={colors.muted} style={styles.input} /><TouchableOpacity disabled={saving} onPress={submit} style={styles.submit}><Text style={styles.submitText}>{saving ? 'Salvando…' : 'Cadastrar cliente'}</Text></TouchableOpacity></View></View></Modal>
  </SafeAreaView>;
}
const createStyles = (colors: ThemeColors) => ({
  screen: { flex: 1, backgroundColor: colors.background }, add: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, list: { padding: 16, gap: 10, paddingBottom: 30 }, card: { backgroundColor: colors.surface, borderRadius: 15, padding: 14, flexDirection: 'row', alignItems: 'center', ...shadows.card }, avatar: { width: 45, height: 45, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: colors.primary, fontWeight: '800', fontSize: 18 }, copy: { flex: 1, marginLeft: 12 }, name: { color: colors.text, fontWeight: '700', fontSize: 16 }, phone: { color: colors.muted, marginTop: 4, fontSize: 13 }, overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay }, sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 34 }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }, modalTitle: { color: colors.text, fontSize: 22, fontWeight: '800' }, label: { color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 6 }, input: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, borderRadius: 11, padding: 13, marginBottom: 15, color: colors.text }, submit: { backgroundColor: colors.primary, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 5 }, submitText: { color: '#FFF', fontWeight: '800' },
});
