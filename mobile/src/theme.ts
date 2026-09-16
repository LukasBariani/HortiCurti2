import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';

const lightColors = {
  background: '#F4F7F5', surface: '#FFFFFF', text: '#17221B', muted: '#68756D',
  primary: '#236B43', primarySoft: '#E4F1E9', border: '#E1E8E3',
  warning: '#B96A16', warningSoft: '#FFF3E4', danger: '#B53A3A',
  blue: '#356EAD', blueSoft: '#EAF2FB', input: '#F4F7F5', overlay: '#00000066',
};
const darkColors: typeof lightColors = {
  background: '#101512', surface: '#19211C', text: '#F1F6F2', muted: '#A5B1A9',
  primary: '#58B77B', primarySoft: '#20382A', border: '#2C3931',
  warning: '#F0A44D', warningSoft: '#352719', danger: '#F27777',
  blue: '#76A9E0', blueSoft: '#1C2C3C', input: '#121814', overlay: '#00000099',
};
export type ThemeColors = typeof lightColors;
export const colors = lightColors;

export const shadows = {
  card: { shadowColor: '#102519', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
};

type ThemeContextValue = { isDark: boolean; colors: ThemeColors; toggleTheme: () => void };
const ThemeContext = createContext<ThemeContextValue>({ isDark: false, colors: lightColors, toggleTheme: () => undefined });
const STORAGE_KEY = '@horticurti:theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => { AsyncStorage.getItem(STORAGE_KEY).then((value) => setIsDark(value === 'dark')).catch(() => undefined); }, []);
  const toggleTheme = useCallback(() => setIsDark((current) => {
    const next = !current;
    void AsyncStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    return next;
  }), []);
  const value = useMemo(() => ({ isDark, colors: isDark ? darkColors : lightColors, toggleTheme }), [isDark, toggleTheme]);
  return React.createElement(ThemeContext.Provider, { value }, children);
}

export const useTheme = () => useContext(ThemeContext);
export function useThemedStyles(factory: (palette: ThemeColors) => Record<string, any>) {
  const { colors: palette } = useTheme();
  return useMemo(() => StyleSheet.create(factory(palette)), [factory, palette]);
}
