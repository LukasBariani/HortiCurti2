// App.tsx
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, Text, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ListaDiaScreen from './ListaDiaScreen';
import ClientesScreen from './ClientesScreen';
import ClientDetailScreen from './ClientDetailScreen';
import PedidosScreen from './PedidosScreen';
import PrecificacaoScreen from './PrecificacaoScreen';
import ChartsScreen from './ChartsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function ClientesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="ClientesList" component={ClientesScreen} />

      <Stack.Screen name="ClientDetail" component={ClientDetailScreen} />
    </Stack.Navigator>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Lista do Dia" component={ListaStack} />

      <Tab.Screen name="Clientes" component={ClientesStack} />

      <Tab.Screen name="Pedidos" component={PedidosStack} />

      <Tab.Screen name="Precificação" component={PrecificacaoStack} />

      <Tab.Screen name="Dashboard" component={DashboardStack} />
    </Tab.Navigator>
  );
}

// 🔥 APP PRINCIPAL
export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <TabNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
