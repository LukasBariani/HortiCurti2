// src/screens/ListaDiaScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getListaConsolidada } from '../services/api';

// Fallback para AsyncStorage
let AsyncStorage: any;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  console.warn('AsyncStorage não disponível, usando fallback em memória');
  AsyncStorage = {
    getItem: async (key: string) => null,
    setItem: async (key: string, value: string) => {},
    removeItem: async (key: string) => {},
  };
}

interface ClienteItem {
  clientName: string;
  quantity: number;
}

interface ItemConsolidado {
  productName: string;
  totalQuantity: number;
  unit: string;
  clients: ClienteItem[];
  checked?: boolean;
}

export default function ListaDiaScreen() {
  const [itens, setItens] = useState<ItemConsolidado[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ItemConsolidado | null>(
    null,
  );
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const data = await getListaConsolidada();

      console.log('📦 Dados da API:', JSON.stringify(data, null, 2));

      // Transformar os dados da API para o formato esperado
      const transformedData = data.map((item: any) => {
        // Mapear clientes do formato da API para o formato do front-end
        const clients = Array.isArray(item.clientes)
          ? item.clientes.map((c: any) => ({
              clientName: c.nome || c.clientName || 'Cliente',
              quantity: c.quantidade || c.quantity || 0,
            }))
          : [];

        return {
          productName: item.productName || item.name || 'Produto',
          totalQuantity: item.totalQuantity || item.quantity || 0,
          unit: item.unit || 'un',
          clients: clients,
          checked: false,
        };
      });

      console.log('✅ Dados transformados:', transformedData.length, 'itens');
      console.log(
        '🔍 Primeiro item:',
        JSON.stringify(transformedData[0], null, 2),
      );

      // Carregar estado dos checks
      let checkedItems: { [key: string]: boolean } = {};
      try {
        const saved = await AsyncStorage.getItem('@checked_items');
        if (saved) {
          checkedItems = JSON.parse(saved);
        }
      } catch (storageError) {
        console.log('Erro ao ler AsyncStorage:', storageError);
      }

      const itemsWithChecks = transformedData.map((item: ItemConsolidado) => ({
        ...item,
        checked: checkedItems[item.productName] || false,
      }));

      setItens(itemsWithChecks);
    } catch (error) {
      console.error('❌ Erro ao carregar itens:', error);
      Alert.alert('Erro', 'Não foi possível carregar a lista');
    } finally {
      setLoading(false);
    }
  };

  const toggleCheck = async (productName: string) => {
    const updatedItens = itens.map((item) => {
      if (item.productName === productName) {
        return { ...item, checked: !item.checked };
      }
      return item;
    });

    setItens(updatedItens);

    try {
      const checkState: { [key: string]: boolean } = {};
      updatedItens.forEach((item) => {
        if (item.checked) {
          checkState[item.productName] = true;
        }
      });
      await AsyncStorage.setItem('@checked_items', JSON.stringify(checkState));
    } catch (storageError) {
      console.log('Erro ao salvar no AsyncStorage:', storageError);
    }
  };

  const openModal = (item: ItemConsolidado) => {
    console.log('📱 Abrindo modal para:', item.productName);
    console.log('👥 Clientes:', item.clients);
    setSelectedItem(item);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedItem(null);
  };

  const getCheckedCount = () => {
    return itens.filter((item) => item.checked).length;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C7BE5" />
        <Text style={styles.loadingText}>Carregando lista...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FA" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>📋 Lista do Dia</Text>
          <Text style={styles.headerSubtitle}>
            {itens.length} produtos • {getCheckedCount()} pegados
          </Text>
        </View>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(getCheckedCount() / itens.length) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {Math.round((getCheckedCount() / itens.length) * 100)}%
          </Text>
        </View>
      </View>

      <FlatList
        data={itens}
        keyExtractor={(item) => item.productName}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={[
              styles.itemCard,
              { backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F8F9FA' },
              item.checked && styles.itemCardChecked,
            ]}
            onPress={() => openModal(item)}
            activeOpacity={0.7}
          >
            <TouchableOpacity
              style={[
                styles.checkButton,
                item.checked && styles.checkButtonChecked,
              ]}
              onPress={() => toggleCheck(item.productName)}
            >
              <Text style={styles.checkIcon}>{item.checked ? '✓' : '○'}</Text>
            </TouchableOpacity>

            <View style={styles.itemInfo}>
              <Text
                style={[
                  styles.itemName,
                  item.checked && styles.itemNameChecked,
                ]}
              >
                {item.productName}
              </Text>
              <Text style={styles.itemUnit}>{item.unit}</Text>
            </View>

            <View style={styles.quantityContainer}>
              <Text
                style={[
                  styles.itemQuantity,
                  item.checked && styles.itemQuantityChecked,
                ]}
              >
                {item.totalQuantity}
              </Text>
              <Text style={styles.quantityLabel}>unidades</Text>
              <Text style={styles.clientCount}>
                {item.clients?.length || 0} clientes
              </Text>
            </View>
          </TouchableOpacity>
        )}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal de Detalhes */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedItem?.productName}</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalInfo}>
              <Text style={styles.modalTotal}>
                Total: {selectedItem?.totalQuantity} {selectedItem?.unit}
              </Text>
              <Text style={styles.modalClientCount}>
                👥 {selectedItem?.clients?.length || 0} clientes pediram este
                item
              </Text>
              <TouchableOpacity
                style={[
                  styles.modalCheckButton,
                  selectedItem?.checked && styles.modalCheckButtonChecked,
                ]}
                onPress={() => {
                  if (selectedItem) {
                    toggleCheck(selectedItem.productName);
                    setSelectedItem({
                      ...selectedItem,
                      checked: !selectedItem.checked,
                    });
                  }
                }}
              >
                <Text style={styles.modalCheckButtonText}>
                  {selectedItem?.checked
                    ? '✓ Peguei este item'
                    : '☐ Marcar como pego'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.clientsList}>
              <Text style={styles.clientsTitle}>📦 Clientes que pediram:</Text>
              {selectedItem?.clients && selectedItem.clients.length > 0 ? (
                selectedItem.clients.map((client, index) => (
                  <View key={index} style={styles.clientItem}>
                    <View style={styles.clientBullet}>
                      <Text style={styles.clientNumber}>{index + 1}</Text>
                    </View>
                    <Text style={styles.clientName}>{client.clientName}</Text>
                    <View style={styles.clientQuantityBadge}>
                      <Text style={styles.clientQuantity}>
                        {client.quantity} {selectedItem?.unit}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.noClientsContainer}>
                  <Text style={styles.noClientsIcon}>📭</Text>
                  <Text style={styles.noClients}>
                    Nenhum cliente registrado para este item
                  </Text>
                  <Text style={styles.noClientsSubtext}>
                    Verifique se a API está retornando os clientes corretamente
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.modalButton} onPress={closeModal}>
              <Text style={styles.modalButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginRight: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    minWidth: 35,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemCardChecked: {
    opacity: 0.6,
    backgroundColor: '#F0FDF4',
  },
  checkButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkButtonChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkIcon: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  itemUnit: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  quantityContainer: {
    alignItems: 'flex-end',
  },
  itemQuantity: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C7BE5',
  },
  itemQuantityChecked: {
    color: '#9CA3AF',
  },
  quantityLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 1,
  },
  clientCount: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  modalInfo: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  modalTotal: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
    marginBottom: 4,
  },
  modalClientCount: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  modalCheckButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalCheckButtonChecked: {
    backgroundColor: '#D1FAE5',
  },
  modalCheckButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  clientsList: {
    maxHeight: 300,
  },
  clientsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  clientBullet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  clientNumber: {
    fontSize: 12,
    color: '#2C7BE5',
    fontWeight: '600',
  },
  clientName: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
  },
  clientQuantityBadge: {
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  clientQuantity: {
    fontSize: 13,
    color: '#2C7BE5',
    fontWeight: '500',
  },
  noClientsContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noClientsIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  noClients: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
    marginTop: 10,
  },
  noClientsSubtext: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
  modalButton: {
    backgroundColor: '#2C7BE5',
    padding: 14,
    borderRadius: 10,
    marginTop: 16,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
