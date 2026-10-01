import React, { useRef, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createClient, updateClient } from '../services/api';
import { parseMarkup } from '../utils/markup';
import { ThemeColors, useTheme, useThemedStyles } from '../theme';

export interface ClientData { id: string; name: string; whatsappNumber: string; defaultMarkupPercent?: number | null }
export default function ClientFormModal({ client, onClose, onSaved }: { client?: ClientData; onClose: () => void; onSaved: (client: ClientData) => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [name, setName] = useState(client?.name ?? '');
  const [phone, setPhone] = useState(client?.whatsappNumber ?? '');
  const [markup, setMarkup] = useState(client?.defaultMarkupPercent == null ? '' : String(client.defaultMarkupPercent).replace('.', ','));
  const [saving, setSaving] = useState(false);
  const locked = useRef(false);
  const phoneRef = useRef<TextInput>(null), markupRef = useRef<TextInput>(null);
  const save = async () => {
    if (locked.current) return;
    const whatsappNumber = phone.replace(/\D/g, '');
    if (!name.trim() || name.trim().length > 120) return Alert.alert('Confira o nome', 'Informe um nome com até 120 caracteres.');
    if (!/^[+\d\s().-]+$/.test(phone) || !/^\d{10,15}$/.test(whatsappNumber)) return Alert.alert('Confira o WhatsApp', 'Informe DDI, DDD e número. Ex.: 55 11 99999-9999.');
    let defaultMarkupPercent: number | null;
    try { defaultMarkupPercent = parseMarkup(markup); } catch (error) { return Alert.alert('Confira o percentual', (error as Error).message); }
    locked.current = true; setSaving(true);
    try {
      const data = { name: name.trim(), whatsappNumber, defaultMarkupPercent };
      const saved = client ? await updateClient(client.id, data) : await createClient(data);
      Keyboard.dismiss(); onSaved(saved); onClose();
    } catch (error) { Alert.alert('Não foi possível salvar', error instanceof Error ? error.message : 'Tente novamente.'); }
    finally { locked.current = false; setSaving(false); }
  };
  return <Modal visible animationType="slide" onRequestClose={() => !locked.current && onClose()}>
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}><Text style={styles.title}>{client ? 'Editar cliente' : 'Novo cliente'}</Text><TouchableOpacity accessibilityLabel="Cancelar edição do cliente" disabled={saving} onPress={onClose} style={styles.cancel}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity></View>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
          <Text style={styles.label}>Nome</Text>
          <TextInput accessibilityLabel="Nome do cliente" editable={!saving} value={name} onChangeText={setName} maxLength={120} placeholder="Nome do cliente ou estabelecimento" placeholderTextColor={colors.muted} style={styles.input} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => phoneRef.current?.focus()} />
          <Text style={styles.label}>WhatsApp</Text>
          <TextInput ref={phoneRef} accessibilityLabel="WhatsApp do cliente" editable={!saving} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="55 11 99999-9999" placeholderTextColor={colors.muted} style={styles.input} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => markupRef.current?.focus()} />
          <Text style={styles.help}>Inclua o código do país (55 para Brasil) e o DDD, para o bot reconhecer o número.</Text>
          <Text style={styles.label}>Acréscimo padrão sobre o custo (%)</Text>
          <TextInput ref={markupRef} accessibilityLabel="Acréscimo padrão sobre o custo" editable={!saving} value={markup} onChangeText={setMarkup} keyboardType="decimal-pad" placeholder="Ex.: 40" placeholderTextColor={colors.muted} style={styles.input} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
          <Text style={styles.help}>Opcional. Deixe vazio para não definir um padrão. Ex.: 40% transforma R$ 100 de custo em R$ 140 de venda.</Text>
          <TouchableOpacity accessibilityRole="button" disabled={saving} onPress={save} style={[styles.save, saving && { opacity: 0.6 }]}><Text style={styles.saveText}>{saving ? 'Salvando…' : client ? 'Salvar alterações' : 'Cadastrar cliente'}</Text></TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
const createStyles = (colors: ThemeColors) => ({
  screen: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 }, header: { paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }, title: { flex: 1, color: colors.text, fontSize: 23, fontWeight: '800' }, cancel: { paddingVertical: 14, paddingHorizontal: 6 }, cancelText: { color: colors.primary, fontWeight: '700' }, content: { padding: 20, paddingBottom: 32 }, label: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 8, marginTop: 12 }, input: { minHeight: 52, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, borderRadius: 12, padding: 14, color: colors.text, fontSize: 16 }, help: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 8 }, save: { backgroundColor: colors.primary, borderRadius: 12, padding: 17, alignItems: 'center', marginTop: 26 }, saveText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
