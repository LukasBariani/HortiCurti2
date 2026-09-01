// src/screens/ClientesScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  StatusBar,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getClients, createClient } from '../services/api';

interface Client {
  id: string;
  name: string;
  whatsappNumber?: string;
  createdAt: string;
}

export default function ClientesScreen({ navigation }: any) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    whatsappNumber: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const data = await getClients();
      console.log('📦 Clientes recebidos:', data);

      const mappedClients = data.map((client: any) => ({
        id: client.id,
        name: client.name,
        whatsappNumber: client.whatsappNumber || '',
        createdAt: client.createdAt,
      }));

      setClients(mappedClients);
    } catch (error) {
      console.error('❌ Erro ao carregar clientes:', error);
      Alert.alert('Erro', 'Não foi possível carregar os clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async () => {
    if (!newClient.name.trim()) {
      Alert.alert('Erro', 'O nome do cliente é obrigatório');
      return;
    }

    if (!newClient.whatsappNumber.trim()) {
      Alert.alert('Erro', 'O número de WhatsApp é obrigatório');
      return;
    }

    const phoneRegex = /^[0-9]+$/;
    if (!phoneRegex.test(newClient.whatsappNumber.trim())) {
      Alert.alert('Erro', 'O WhatsApp deve conter apenas números');
      return;
    }

    setSubmitting(true);
    try {
      const clientData = {
        name: newClient.name.trim(),
        whatsappNumber: newClient.whatsappNumber.trim(),
      };

      console.log('📤 Enviando cliente:', clientData);

      await createClient(clientData);
      Alert.alert('Sucesso', 'Cliente cadastrado com sucesso!');
      setModalVisible(false);
      setNewClient({ name: '', whatsappNumber: '' });
      await loadClients();
    } catch (error: any) {
      console.error('❌ Erro ao criar cliente:', error);
      Alert.alert('Erro', 'Não foi possível cadastrar o cliente');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClientPress = (clientId: string) => {
    console.log('🖱️ Navegando para ClientDetail com ID:', clientId);

    navigation.navigate('ClientDetail', {
      clientId,
    });
  };
  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length <= 11) {
      return cleaned;
    }
    return cleaned;
  };

  const renderClientItem = ({
    item,
    index,
  }: {
    item: Client;
    index: number;
  }) => (
    <Pressable
      style={({ pressed }) => [
        styles.clientCard,
        {
          backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F8F9FA',
          opacity: pressed ? 0.7 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
      onPress={() => handleClientPress(item.id)}
      android_ripple={{ color: '#E5E7EB', borderless: false }}
    >
      <View style={styles.clientAvatar}>
        <Text style={styles.clientAvatarText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.clientInfo}>
        <Text style={styles.clientName}>{item.name}</Text>
        {item.whatsappNumber && (
          <Text style={styles.clientDetail}>
            📱 {formatPhoneNumber(item.whatsappNumber)}
          </Text>
        )}
        <Text style={styles.clientDate}>
          🕐 {new Date(item.createdAt).toLocaleDateString('pt-BR')}
        </Text>
      </View>
      <View style={styles.arrowContainer}>
        <Text style={styles.arrowIcon}>›</Text>
      </View>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C7BE5" />
        <Text style={styles.loadingText}>Carregando clientes...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FA" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>👥 Clientes</Text>
          <Text style={styles.headerSubtitle}>
            {clients.length} clientes cadastrados
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={clients}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={renderClientItem}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>Nenhum cliente cadastrado</Text>
            <Text style={styles.emptySubtext}>
              Clique no botão + para adicionar
            </Text>
          </View>
        }
        removeClippedSubviews={false}
      />

      {/* Modal de Cadastro */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo Cliente</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
                activeOpacity={0.7}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.formContainer}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.form}>
                <Text style={styles.label}>Nome *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Digite o nome do cliente"
                  value={newClient.name}
                  onChangeText={(text) =>
                    setNewClient({ ...newClient, name: text })
                  }
                />

                <Text style={styles.label}>WhatsApp *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Digite o WhatsApp (ex: 11999999999)"
                  value={newClient.whatsappNumber}
                  onChangeText={(text) =>
                    setNewClient({
                      ...newClient,
                      whatsappNumber: text.replace(/\D/g, ''),
                    })
                  }
                  keyboardType="phone-pad"
                  maxLength={11}
                />
                {newClient.whatsappNumber.length > 0 && (
                  <Text style={styles.helperText}>
                    Número: {newClient.whatsappNumber}
                  </Text>
                )}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.submitButton,
                submitting && styles.submitButtonDisabled,
              ]}
              onPress={handleCreateClient}
              disabled={submitting}
              activeOpacity={0.7}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? 'Cadastrando...' : 'Cadastrar Cliente'}
              </Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2C7BE5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2C7BE5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  clientCard: {
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
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  clientAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C7BE5',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  clientDetail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  clientDate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  arrowContainer: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowIcon: {
    fontSize: 24,
    color: '#D1D5DB',
    fontWeight: '300',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
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
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
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
  formContainer: {
    maxHeight: 400,
  },
  form: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: -12,
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#2C7BE5',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
