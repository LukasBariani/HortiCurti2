import { StatusBar } from 'expo-status-bar';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import ListaDiaScreen from './src/screens/ListaDiaScreen';
import ClientesScreen from './src/screens/ClientesScreen';
import PedidosScreen from './src/screens/PedidosScreen';
import PrecificacaoScreen from './src/screens/PrecificacaoScreen';
import { StyleSheet, Text, View } from 'react-native';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Lista do Dia" component={ListaDiaScreen} />
        <Tab.Screen name="Clientes" component={ClientesScreen} />
        <Tab.Screen name="Pedidos" component={PedidosScreen} />
        <Tab.Screen name="Precificação" component={PrecificacaoScreen} />
      </Tab.Navigator>
    </NavigationContainer>
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
