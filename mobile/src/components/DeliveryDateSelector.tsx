import React, { useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { formatDeliveryDate, fromCalendarDate, shiftDate, todayInSaoPaulo, toCalendarDate } from '../utils/deliveryDate';
import { ThemeColors, useTheme, useThemedStyles } from '../theme';

export default function DeliveryDateSelector({ date, onChange, onRefresh }: {
  date: string; onChange: (date: string) => void; onRefresh?: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState(() => toCalendarDate(date));
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const select = (next: string) => next === date ? onRefresh?.() : onChange(next);
  const openCalendar = () => {
    const value = toCalendarDate(date);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'date',
        display: 'calendar',
        positiveButton: { label: 'Selecionar' },
        negativeButton: { label: 'Cancelar' },
        onValueChange: (_event, selected) => select(fromCalendarDate(selected)),
      });
      return;
    }
    setDraft(value);
    setVisible(true);
  };
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Data de entrega</Text>
      <View style={styles.row}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Dia anterior" style={styles.button} onPress={() => select(shiftDate(date, -1))}>
          <Text style={styles.action}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Abrir calendário, ${formatDeliveryDate(date)}`} style={styles.dateButton} onPress={openCalendar}>
          <Text style={styles.dateText}>📅 {formatDeliveryDate(date)}</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Próximo dia" style={styles.button} onPress={() => select(shiftDate(date, 1))}>
          <Text style={styles.action}>›</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => select(todayInSaoPaulo())}><Text style={styles.action}>Hoje</Text></TouchableOpacity>
        {onRefresh && <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={onRefresh}><Text style={styles.action}>Atualizar</Text></TouchableOpacity>}
      </View>
      {Platform.OS === 'ios' && (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
          <View style={styles.overlay}>
            <View style={styles.sheet}>
              <Text style={styles.label}>Escolha a data de entrega</Text>
              <DateTimePicker value={draft} mode="date" display="inline" locale="pt-BR"
                themeVariant={isDark ? 'dark' : 'light'} onValueChange={(_event, selected) => setDraft(selected)} />
              <View style={styles.row}>
                <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => setVisible(false)}><Text style={styles.action}>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => { setVisible(false); select(fromCalendarDate(draft)); }}><Text style={styles.action}>Selecionar</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
const createStyles = (colors: ThemeColors) => ({
  container: { padding: 12, backgroundColor: colors.surface, gap: 8 },
  label: { color: colors.text, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dateButton: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  dateText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  button: { minHeight: 44, minWidth: 48, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', borderRadius: 8, backgroundColor: colors.blueSoft },
  action: { color: colors.blue, fontWeight: '600' },
  overlay: { flex: 1, justifyContent: 'center', backgroundColor: colors.overlay, padding: 16 },
  sheet: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 12 },
});
