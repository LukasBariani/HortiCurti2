// App.tsx
import { StatusBar } from 'expo-status-bar';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { StyleSheet, Text, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import ListaDiaScreen from './src/screens/ListaDiaScreen';
import ClientesScreen from './src/screens/ClientesScreen';
import PedidosScreen from './src/screens/PedidosScreen';
import PrecificacaoScreen from './src/screens/PrecificacaoScreen';

const Tab = createBottomTabNavigator();

function AppNavigator() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let icon;
              if (route.name === 'Lista do Dia') {
                icon = '📋';
              } else if (route.name === 'Clientes') {
                icon = '👥';
              } else if (route.name === 'Pedidos') {
                icon = '📦';
              } else if (route.name === 'Precificação') {
                icon = '💰';
              }
              return <Text style={{ fontSize: size, color }}>{icon}</Text>;
            },
            tabBarActiveTintColor: '#2C7BE5',
            tabBarInactiveTintColor: '#9CA3AF',
            tabBarStyle: {
              backgroundColor: '#FFFFFF',
              borderTopWidth: 1,
              borderTopColor: '#E5E7EB',
              height: Platform.OS === 'ios' ? 85 : 65,
              paddingBottom: Platform.OS === 'ios' ? 20 : 5,
              paddingTop: 5,
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
              title: 'Clientes',
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
              title: 'Precificação',
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
});
