import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { ThemeColors, useTheme, useThemedStyles } from '../theme';

export default function ScreenHeader({ eyebrow = 'HORTICURTI', title, subtitle, action }: {
  eyebrow?: string; title: string; subtitle?: string; action?: React.ReactNode;
}) {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.header}>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <View style={styles.actions}>{action}<TouchableOpacity accessibilityRole="button" accessibilityLabel={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'} onPress={toggleTheme} style={styles.themeButton}><Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={21} color={colors.text} /></TouchableOpacity></View>
    </View>
  );
}
const createStyles = (colors: ThemeColors) => ({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18, backgroundColor: colors.surface },
  copy: { flex: 1 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: 5 },
  title: { color: colors.text, fontSize: 27, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: 5, lineHeight: 20 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 10 },
  themeButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
});
