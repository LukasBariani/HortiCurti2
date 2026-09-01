// src/screens/ClientDetailScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
  Linking,
  RefreshControl,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getClientOrders, getClientInfo } from '../services/api';

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
}

interface Order {
  id: string;
  date: string;
  status: 'pending' | 'delivered' | 'cancelled';
  items: OrderItem[];
  total: number;
}

interface ClientInfo {
  id: string;
  name: string;
  whatsappNumber: string;
  email?: string;
  createdAt: string;
  totalSpent: number;
  orderCount: number;
  lastOrderDate: string;
  favoriteProducts?: string[];
}

export default function ClientDetailScreen({ route, navigation }: any) {
  const { clientId } = route.params;
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    loadClientData();
  }, []);

  const loadClientData = async () => {
    try {
      const [clientData, ordersData] = await Promise.all([
        getClientInfo(clientId),
        getClientOrders(clientId),
      ]);

      setClient(clientData);
      setOrders(ordersData);
    } catch (error) {
      console.error('Erro ao carregar dados do cliente:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados do cliente');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadClientData();
  };

  const toggleOrder = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const openWhatsApp = (phoneNumber: string) => {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    const url = `https://wa.me/55${cleanNumber}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp');
    });
  };

  const openPhoneCall = (phoneNumber: string) => {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    const url = `tel:+55${cleanNumber}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Erro', 'Não foi possível fazer a ligação');
    });
  };

  const shareClientInfo = async () => {
    try {
      const message = `
📋 *Dados do Cliente*
━━━━━━━━━━━━━━━━━━━
👤 *Nome:* ${client?.name}
📱 *WhatsApp:* ${client?.whatsappNumber}
💰 *Total Gasto:* R$ ${client?.totalSpent?.toFixed(2) || '0,00'}
📦 *Pedidos:* ${client?.orderCount || 0}
📅 *Último Pedido:* ${client?.lastOrderDate ? new Date(client.lastOrderDate).toLocaleDateString('pt-BR') : '-'}
━━━━━━━━━━━━━━━━━━━
      `;

      await Share.share({
        message: message,
        title: `Dados do Cliente - ${client?.name}`,
      });
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'delivered':
        return '✅ Entregue';
      case 'pending':
        return '⏳ Pendente';
      case 'cancelled':
        return '❌ Cancelado';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return '✅';
      case 'pending':
        return '⏳';
      case 'cancelled':
        return '❌';
      default:
        return '📦';
    }
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C7BE5" />
        <Text style={styles.loadingText}>Carregando dados...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FA" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header com informações do cliente */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={shareClientInfo}
            >
              <Text style={styles.shareButtonText}>📤</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.clientHeaderInfo}>
            <View style={styles.clientAvatar}>
              <Text style={styles.clientAvatarText}>
                {client?.name?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.clientHeaderDetails}>
              <Text style={styles.clientName}>{client?.name}</Text>
              <Text style={styles.clientSince}>
                Cliente desde{' '}
                {client?.createdAt
                  ? new Date(client.createdAt).toLocaleDateString('pt-BR')
                  : '-'}
              </Text>
              {client?.whatsappNumber && (
                <View style={styles.contactButtons}>
                  <TouchableOpacity
                    style={[styles.contactButton, styles.whatsappButton]}
                    onPress={() => openWhatsApp(client.whatsappNumber || '')}
                  >
                    <Text style={styles.contactButtonText}>💬 WhatsApp</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.contactButton, styles.phoneButton]}
                    onPress={() => openPhoneCall(client.whatsappNumber || '')}
                  >
                    <Text style={styles.contactButtonText}>📞 Ligar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              R$ {client?.totalSpent?.toFixed(2) || '0,00'}
            </Text>
            <Text style={styles.statLabel}>💰 Total Gasto</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{client?.orderCount || 0}</Text>
            <Text style={styles.statLabel}>📦 Pedidos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {client?.orderCount && client?.totalSpent
                ? `R$ ${(client.totalSpent / client.orderCount).toFixed(2)}`
                : 'R$ 0,00'}
            </Text>
            <Text style={styles.statLabel}>🎯 Ticket Médio</Text>
          </View>
        </View>

        {/* Produtos Favoritos */}
        {client?.favoriteProducts && client.favoriteProducts.length > 0 && (
          <View style={styles.favoritesSection}>
            <Text style={styles.sectionTitle}>⭐ Produtos Favoritos</Text>
            <View style={styles.favoritesContainer}>
              {client.favoriteProducts.slice(0, 5).map((product, index) => (
                <View key={index} style={styles.favoriteTag}>
                  <Text style={styles.favoriteTagText}>{product}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Histórico de Pedidos */}
        <View style={styles.ordersSection}>
          <Text style={styles.sectionTitle}>📦 Histórico de Pedidos</Text>

          {orders.length === 0 ? (
            <View style={styles.emptyOrders}>
              <Text style={styles.emptyOrdersIcon}>📭</Text>
              <Text style={styles.emptyOrdersText}>
                Nenhum pedido encontrado
              </Text>
              <Text style={styles.emptyOrdersSubtext}>
                Este cliente ainda não fez compras
              </Text>
            </View>
          ) : (
            orders.map((order, index) => (
              <TouchableOpacity
                key={order.id}
                style={[
                  styles.orderCard,
                  order.status === 'delivered' && styles.orderCardDelivered,
                  order.status === 'pending' && styles.orderCardPending,
                  order.status === 'cancelled' && styles.orderCardCancelled,
                ]}
                onPress={() => toggleOrder(order.id)}
                activeOpacity={0.7}
              >
                <View style={styles.orderHeader}>
                  <View style={styles.orderLeftInfo}>
                    <Text style={styles.orderNumber}>Pedido #{index + 1}</Text>
                    <Text style={styles.orderDate}>
                      📅{' '}
                      {new Date(order.date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                    <View style={styles.orderStatus}>
                      <Text style={styles.orderStatusIcon}>
                        {getStatusIcon(order.status)}
                      </Text>
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(order.status) },
                        ]}
                      >
                        {getStatusText(order.status)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.orderRightInfo}>
                    <Text style={styles.orderTotal}>
                      R$ {order.total?.toFixed(2) || '0,00'}
                    </Text>
                    <Text style={styles.orderItemsCount}>
                      {order.items?.length || 0} itens
                    </Text>
                    <Text style={styles.expandIcon}>
                      {expandedOrder === order.id ? '▲' : '▼'}
                    </Text>
                  </View>
                </View>

                {expandedOrder === order.id && (
                  <View style={styles.orderItems}>
                    <View style={styles.orderItemsHeader}>
                      <Text style={styles.orderItemsHeaderText}>Produto</Text>
                      <Text style={styles.orderItemsHeaderText}>Qtd</Text>
                      <Text style={styles.orderItemsHeaderText}>Preço</Text>
                      <Text style={styles.orderItemsHeaderText}>Total</Text>
                    </View>
                    {order.items?.map((item) => (
                      <View key={item.id} style={styles.orderItem}>
                        <View style={styles.orderItemInfo}>
                          <Text style={styles.orderItemName}>
                            {item.productName}
                          </Text>
                          <Text style={styles.orderItemUnit}>{item.unit}</Text>
                        </View>
                        <Text style={styles.orderItemQuantity}>
                          {item.quantity}x
                        </Text>
                        <Text style={styles.orderItemPrice}>
                          R$ {item.price?.toFixed(2) || '0,00'}
                        </Text>
                        <Text style={styles.orderItemTotal}>
                          R$ {item.total?.toFixed(2) || '0,00'}
                        </Text>
                      </View>
                    ))}
                    <View style={styles.orderTotalRow}>
                      <Text style={styles.orderTotalLabel}>
                        Total do Pedido
                      </Text>
                      <Text style={styles.orderTotalValue}>
                        R$ {order.total?.toFixed(2) || '0,00'}
                      </Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Rodapé com informações adicionais */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🕐 Última atualização: {new Date().toLocaleString('pt-BR')}
          </Text>
        </View>
      </ScrollView>
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
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: '#1F2937',
    fontWeight: 'bold',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButtonText: {
    fontSize: 18,
  },
  clientHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E5F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  clientAvatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C7BE5',
  },
  clientHeaderDetails: {
    flex: 1,
  },
  clientName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  clientSince: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  contactButtons: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  contactButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappButton: {
    backgroundColor: '#25D366',
  },
  phoneButton: {
    backgroundColor: '#3B82F6',
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C7BE5',
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  favoritesSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  favoritesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  favoriteTag: {
    backgroundColor: '#E5F0FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  favoriteTagText: {
    fontSize: 12,
    color: '#2C7BE5',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  ordersSection: {
    padding: 16,
  },
  emptyOrders: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  emptyOrdersIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyOrdersText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  emptyOrdersSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#E5E7EB',
  },
  orderCardDelivered: {
    borderLeftColor: '#10B981',
  },
  orderCardPending: {
    borderLeftColor: '#F59E0B',
  },
  orderCardCancelled: {
    borderLeftColor: '#EF4444',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderLeftInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  orderDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  orderStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  orderStatusIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  orderRightInfo: {
    alignItems: 'flex-end',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C7BE5',
  },
  orderItemsCount: {
    fontSize: 11,
    color: '#6B7280',
  },
  expandIcon: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  orderItems: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  orderItemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 8,
  },
  orderItemsHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    flex: 1,
    textAlign: 'center',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  orderItemUnit: {
    fontSize: 10,
    color: '#6B7280',
  },
  orderItemQuantity: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    minWidth: 35,
    textAlign: 'center',
  },
  orderItemPrice: {
    fontSize: 13,
    color: '#6B7280',
    minWidth: 50,
    textAlign: 'center',
  },
  orderItemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C7BE5',
    minWidth: 60,
    textAlign: 'right',
  },
  orderTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
  },
  orderTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  orderTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C7BE5',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
