import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemeColors, useTheme, useThemedStyles } from '../theme';

export default function StateView({ loading, error, empty, onRetry }: {
  loading?: boolean; error?: string; empty?: string; onRetry?: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  if (loading) return <View style={styles.box}><ActivityIndicator color={colors.primary} /><Text style={styles.text}>Carregando…</Text></View>;
  if (error) return <View style={styles.box}><Text style={styles.icon}>!</Text><Text style={styles.title}>Não foi possível carregar</Text><Text style={styles.text}>{error}</Text>{onRetry && <TouchableOpacity style={styles.button} onPress={onRetry}><Text style={styles.buttonText}>Tentar novamente</Text></TouchableOpacity>}</View>;
  if (empty) return <View style={styles.box}><Text style={styles.icon}>✓</Text><Text style={styles.title}>{empty}</Text><Text style={styles.text}>Escolha outra data ou atualize a página.</Text></View>;
  return null;
}
const createStyles = (colors: ThemeColors) => ({
  box: { alignItems: 'center', justifyContent: 'center', padding: 36, gap: 8 },
  icon: { width: 38, height: 38, borderRadius: 19, textAlign: 'center', textAlignVertical: 'center', backgroundColor: colors.primarySoft, color: colors.primary, fontWeight: '800', fontSize: 20 },
  title: { color: colors.text, fontWeight: '700', fontSize: 16 },
  text: { color: colors.muted, textAlign: 'center', lineHeight: 20 },
  button: { marginTop: 6, backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 10 },
  buttonText: { color: '#FFF', fontWeight: '700' },
});
