import { StatusBar } from 'expo-status-bar';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import ListaDiaScreen from './src/screens/ListaDiaScreen';
import ClientesScreen from './src/screens/ClientesScreen';
import PedidosScreen from './src/screens/PedidosScreen';
import PrecificacaoScreen from './src/screens/PrecificacaoScreen';
import { StyleSheet, Text, View } from 'react-native';

// Instale: npm install @expo/vector-icons
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: any;
            if (route.name === 'Lista do Dia') {
              iconName = focused ? 'list' : 'list-outline';
            } else if (route.name === 'Clientes') {
              iconName = focused ? 'people' : 'people-outline';
            } else if (route.name === 'Pedidos') {
              iconName = focused ? 'cart' : 'cart-outline';
            } else if (route.name === 'Precificação') {
              iconName = focused ? 'pricetag' : 'pricetag-outline';
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#2C7BE5',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#E5E7EB',
            height: 60,
            paddingBottom: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
            marginTop: -4,
          },
          headerStyle: {
            backgroundColor: '#FFFFFF',
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB',
          },
          headerTintColor: '#1F2937',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
          },
        })}
      >
        <Tab.Screen
          name="Lista do Dia"
          component={ListaDiaScreen}
          options={{
            headerShown: false,
          }}
        />
        <Tab.Screen
          name="Clientes"
          component={ClientesScreen}
          options={{
            headerShown: true,
          }}
        />
        <Tab.Screen
          name="Pedidos"
          component={PedidosScreen}
          options={{
            headerShown: false,
          }}
        />
        <Tab.Screen
          name="Precificação"
          component={PrecificacaoScreen}
          options={{
            headerShown: true,
          }}
        />
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
