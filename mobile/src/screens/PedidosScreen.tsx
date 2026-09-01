// src/screens/PedidosScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getOrdersToday } from '../services/api';

interface ItemPedido {
  id: string;
  productName: string;
  quantity: number;
  unit: string;
}

interface Pedido {
  id: string;
  client: { name: string };
  items: ItemPedido[];
}

export default function PedidosScreen() {
  const [orders, setOrders] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    getOrdersToday().then((data) => {
      setOrders(data);
      setLoading(false);
    });
  }, []);

  const toggleOrder = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const getTotalItems = (items: ItemPedido[]) => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C7BE5" />
        <Text style={styles.loadingText}>Carregando pedidos...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FA" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>📦 Pedidos de Hoje</Text>
        <Text style={styles.headerSubtitle}>
          {orders.length} pedidos ativos
        </Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(pedido) => pedido.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item: pedido }) => {
          const isExpanded = expandedOrder === pedido.id;
          const totalItems = getTotalItems(pedido.items);

          return (
            <TouchableOpacity
              style={styles.orderCard}
              onPress={() => toggleOrder(pedido.id)}
              activeOpacity={0.7}
            >
              <View style={styles.orderHeader}>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{pedido.client.name}</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{totalItems} itens</Text>
                  </View>
                </View>
                <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
              </View>

              {isExpanded && (
                <View style={styles.itemsContainer}>
                  {pedido.items.map((item, index) => (
                    <View key={item.id} style={styles.itemRow}>
                      <View style={styles.itemBullet}>
                        <Text style={styles.itemNumber}>{index + 1}</Text>
                      </View>
                      <View style={styles.itemDetails}>
                        <Text style={styles.itemName}>{item.productName}</Text>
                        <Text style={styles.itemUnit}>{item.unit}</Text>
                      </View>
                      <View style={styles.itemQuantityContainer}>
                        <Text style={styles.itemQuantity}>
                          {item.quantity}x
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  clientName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 8,
  },
  badge: {
    backgroundColor: '#E5F0FF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    color: '#2C7BE5',
    fontWeight: '500',
  },
  expandIcon: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  itemsContainer: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  itemNumber: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  itemUnit: {
    fontSize: 11,
    color: '#6B7280',
  },
  itemQuantityContainer: {
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#2C7BE5',
    fontWeight: 'bold',
  },
});
