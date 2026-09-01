import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { getListaConsolidada } from '../services/api';

interface ItemConsolidado {
  productName: string;
  totalQuantity: number;
  unit: string;
}

export default function ListaDiaScreen() {
  const [itens, setItens] = useState<ItemConsolidado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getListaConsolidada().then((data) => {
      setItens(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C7BE5" />
        <Text style={styles.loadingText}>Carregando lista...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FA" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 Lista do Dia</Text>
        <Text style={styles.headerSubtitle}>
          {itens.length} produtos no total
        </Text>
      </View>

      <FlatList
        data={itens}
        keyExtractor={(item) => item.productName}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item, index }) => (
          <View
            style={[
              styles.itemCard,
              { backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F8F9FA' },
            ]}
          >
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.productName}</Text>
              <Text style={styles.itemUnit}>{item.unit}</Text>
            </View>
            <View style={styles.quantityContainer}>
              <Text style={styles.itemQuantity}>{item.totalQuantity}</Text>
              <Text style={styles.quantityLabel}>unidades</Text>
            </View>
          </View>
        )}
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
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
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
  quantityLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 1,
  },
});
