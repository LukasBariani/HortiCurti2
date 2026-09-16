// App.tsx
import { StatusBar } from 'expo-status-bar';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import ListaDiaScreen from './src/screens/ListaDiaScreen';
import ClientesScreen from './src/screens/ClientesScreen';
import PedidosScreen from './src/screens/PedidosScreen';
import PrecificacaoScreen from './src/screens/PrecificacaoScreen';
import ChartsScreen from './src/screens/ChartsScreen';
import ClientDetailScreen from './src/screens/ClientDetailScreen';
import { ThemeProvider, useTheme } from './src/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function ClientsStack() {
  return <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ClientsList" component={ClientesScreen} />
    <Stack.Screen name="ClientDetail" component={ClientDetailScreen} />
  </Stack.Navigator>;
}

function AppNavigator() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
    },
  };
  return (
      <NavigationContainer theme={navigationTheme}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarIcon: ({ focused, color, size }) => {
              const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
                Resumo: focused ? 'grid' : 'grid-outline', Lista: focused ? 'checkbox' : 'checkbox-outline',
                Pedidos: focused ? 'receipt' : 'receipt-outline', Preços: focused ? 'pricetags' : 'pricetags-outline',
                Clientes: focused ? 'people' : 'people-outline',
              };
              return <Ionicons name={icons[route.name]} size={size} color={color} />;
            },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.muted,
            tabBarStyle: {
              backgroundColor: colors.surface, borderTopColor: colors.border,
              height: 62 + Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 8),
              paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 8),
              paddingTop: 8,
            },
            tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
          })}
        >
          <Tab.Screen name="Resumo" component={ChartsScreen} />
          <Tab.Screen name="Lista" component={ListaDiaScreen} />
          <Tab.Screen name="Pedidos" component={PedidosScreen} />
          <Tab.Screen name="Preços" component={PrecificacaoScreen} />
          <Tab.Screen name="Clientes" component={ClientsStack} />
        </Tab.Navigator>
      </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function ThemedApp() {
  const { isDark } = useTheme();
  return <><StatusBar style={isDark ? 'light' : 'dark'} /><AppNavigator /></>;
}
