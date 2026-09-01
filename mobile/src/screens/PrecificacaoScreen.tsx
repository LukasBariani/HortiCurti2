// src/screens/PrecificacaoScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  Switch,
} from 'react-native';
import { SafeAreaView as SafeAreaViewContext } from 'react-native-safe-area-context';
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

interface ItemConsolidado {
  productName: string;
  totalQuantity: number;
  unit: string;
  clients: any[];
}

interface PricingItem extends ItemConsolidado {
  purchasePrice: string;
  margin: string;
  finalPrice: string;
  profit: string;
  calculationMode: 'fromCost' | 'fromFinal';
}

export default function PrecificacaoScreen() {
  const [itens, setItens] = useState<PricingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const data = await getListaConsolidada();

      let savedPrices: { [key: string]: any } = {};
      try {
        const saved = await AsyncStorage.getItem('@pricing_data');
        if (saved) {
          savedPrices = JSON.parse(saved);
        }
      } catch (storageError) {
        console.log('Erro ao ler dados salvos:', storageError);
      }

      const pricingData = data.map((item: ItemConsolidado) => {
        const saved = savedPrices[item.productName] || {};
        return {
          ...item,
          purchasePrice: saved.purchasePrice || '',
          margin: saved.margin || '',
          finalPrice: saved.finalPrice || '',
          profit: saved.profit || '',
          calculationMode: saved.calculationMode || 'fromCost',
        };
      });
      setItens(pricingData);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os itens');
    } finally {
      setLoading(false);
    }
  };

  const calculateFromCost = (purchasePrice: number, margin: number) => {
    if (!purchasePrice || !margin) return { finalPrice: '', profit: '' };
    const finalPrice = purchasePrice * (1 + margin / 100);
    const profit = finalPrice - purchasePrice;
    return {
      finalPrice: finalPrice.toFixed(2),
      profit: profit.toFixed(2),
    };
  };

  const calculateFromFinal = (purchasePrice: number, finalPrice: number) => {
    if (!purchasePrice || !finalPrice) return { margin: '', profit: '' };
    const profit = finalPrice - purchasePrice;
    const margin = (profit / purchasePrice) * 100;
    return {
      margin: margin.toFixed(1),
      profit: profit.toFixed(2),
    };
  };

  const handleInputChange = (
    index: number,
    field: 'purchasePrice' | 'margin' | 'finalPrice',
    value: string,
  ) => {
    const updatedItens = [...itens];
    const numericValue = value.replace(/[^0-9.]/g, '');

    updatedItens[index][field] = numericValue;

    const purchasePrice = parseFloat(updatedItens[index].purchasePrice);
    const margin = parseFloat(updatedItens[index].margin);
    const finalPrice = parseFloat(updatedItens[index].finalPrice);

    if (field === 'purchasePrice' || field === 'margin') {
      if (purchasePrice && margin) {
        const result = calculateFromCost(purchasePrice, margin);
        updatedItens[index].finalPrice = result.finalPrice;
        updatedItens[index].profit = result.profit;
      } else {
        updatedItens[index].finalPrice = '';
        updatedItens[index].profit = '';
      }
    } else if (field === 'finalPrice') {
      if (purchasePrice && finalPrice) {
        const result = calculateFromFinal(purchasePrice, finalPrice);
        updatedItens[index].margin = result.margin;
        updatedItens[index].profit = result.profit;
      } else {
        updatedItens[index].margin = '';
        updatedItens[index].profit = '';
      }
    }

    setItens(updatedItens);
  };

  const toggleCalculationMode = (index: number) => {
    const updatedItens = [...itens];
    const currentMode = updatedItens[index].calculationMode;
    updatedItens[index].calculationMode =
      currentMode === 'fromCost' ? 'fromFinal' : 'fromCost';
    updatedItens[index].margin = '';
    updatedItens[index].finalPrice = '';
    updatedItens[index].profit = '';
    setItens(updatedItens);
  };

  const handleSaveAll = async () => {
    const itemsToSave = itens.filter(
      (item) => item.purchasePrice && (item.margin || item.finalPrice),
    );

    if (itemsToSave.length === 0) {
      Alert.alert('Aviso', 'Nenhum item com preço preenchido para salvar');
      return;
    }

    setSaving(true);
    try {
      const savedData: { [key: string]: any } = {};
      itens.forEach((item) => {
        if (item.purchasePrice) {
          savedData[item.productName] = {
            purchasePrice: item.purchasePrice,
            margin: item.margin,
            finalPrice: item.finalPrice,
            profit: item.profit,
            calculationMode: item.calculationMode,
          };
        }
      });
      await AsyncStorage.setItem('@pricing_data', JSON.stringify(savedData));
      Alert.alert('Sucesso', `${itemsToSave.length} itens salvos com sucesso!`);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar os preços');
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: PricingItem;
    index: number;
  }) => {
    const hasPricing = item.purchasePrice && (item.margin || item.finalPrice);
    const isFromCost = item.calculationMode === 'fromCost';

    return (
      <View
        style={[styles.pricingCard, hasPricing && styles.pricingCardFilled]}
      >
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.productName}</Text>
          <Text style={styles.productDetails}>
            {item.totalQuantity} {item.unit} • {item.clients?.length || 0}{' '}
            clientes
          </Text>
        </View>

        <View style={styles.modeToggle}>
          <Text style={styles.modeLabel}>Modo de cálculo:</Text>
          <View style={styles.switchContainer}>
            <Text
              style={[
                styles.switchLabel,
                isFromCost && styles.switchLabelActive,
              ]}
            >
              Custo → Final
            </Text>
            <Switch
              value={!isFromCost}
              onValueChange={() => toggleCalculationMode(index)}
              trackColor={{ false: '#E5E7EB', true: '#2C7BE5' }}
              thumbColor={!isFromCost ? '#FFFFFF' : '#FFFFFF'}
            />
            <Text
              style={[
                styles.switchLabel,
                !isFromCost && styles.switchLabelActive,
              ]}
            >
              Final → Custo
            </Text>
          </View>
        </View>

        <View style={styles.pricingRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Preço de Custo (R$)</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>R$</Text>
              <TextInput
                style={styles.input}
                placeholder="0,00"
                keyboardType="decimal-pad"
                value={item.purchasePrice}
                onChangeText={(value) =>
                  handleInputChange(index, 'purchasePrice', value)
                }
              />
            </View>
          </View>

          {isFromCost ? (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Margem de Lucro (%)</Text>
              <TextInput
                style={[styles.input, styles.marginInput]}
                placeholder="30"
                keyboardType="decimal-pad"
                value={item.margin}
                onChangeText={(value) =>
                  handleInputChange(index, 'margin', value)
                }
              />
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Preço Final (R$)</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>R$</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0,00"
                  keyboardType="decimal-pad"
                  value={item.finalPrice}
                  onChangeText={(value) =>
                    handleInputChange(index, 'finalPrice', value)
                  }
                />
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Lucro (R$)</Text>
            <View style={[styles.inputContainer, styles.profitContainer]}>
              <Text style={styles.currencySymbol}>R$</Text>
              <Text
                style={[
                  styles.profitText,
                  parseFloat(item.profit) > 0 && styles.profitPositive,
                ]}
              >
                {item.profit || '---'}
              </Text>
            </View>
          </View>
        </View>

        {!isFromCost && item.margin && (
          <View style={styles.calculatedMargin}>
            <Text style={styles.calculatedMarginText}>
              Margem calculada: {item.margin}%
            </Text>
          </View>
        )}

        {isFromCost && item.finalPrice && (
          <View style={styles.calculatedPrice}>
            <Text style={styles.calculatedPriceText}>
              Preço final calculado: R$ {item.finalPrice}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C7BE5" />
        <Text style={styles.loadingText}>Carregando itens...</Text>
      </View>
    );
  }

  const totalPriced = itens.filter(
    (item) => item.purchasePrice && (item.margin || item.finalPrice),
  ).length;

  return (
    <SafeAreaViewContext style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FA" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>💰 Precificação</Text>
        <Text style={styles.headerSubtitle}>
          {totalPriced} de {itens.length} itens precificados
        </Text>
      </View>

      <FlatList
        data={itens}
        keyExtractor={(item) => item.productName}
        contentContainerStyle={styles.listContainer}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSaveAll}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Salvando...' : '💾 Salvar Todos'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaViewContext>
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
    paddingBottom: 100,
  },
  pricingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  pricingCardFilled: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  productInfo: {
    marginBottom: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  productDetails: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  modeLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  switchLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginHorizontal: 4,
  },
  switchLabelActive: {
    color: '#1F2937',
    fontWeight: '500',
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 8,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 40,
  },
  currencySymbol: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginRight: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1F2937',
    height: 40,
  },
  marginInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  profitContainer: {
    backgroundColor: '#F0FDF4',
    borderColor: '#A7F3D0',
  },
  profitText: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  profitPositive: {
    color: '#059669',
  },
  calculatedMargin: {
    marginTop: 8,
    padding: 6,
    backgroundColor: '#F0F7FF',
    borderRadius: 6,
  },
  calculatedMarginText: {
    fontSize: 12,
    color: '#2C7BE5',
    textAlign: 'center',
  },
  calculatedPrice: {
    marginTop: 8,
    padding: 6,
    backgroundColor: '#F0FDF4',
    borderRadius: 6,
  },
  calculatedPriceText: {
    fontSize: 12,
    color: '#059669',
    textAlign: 'center',
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  saveButton: {
    backgroundColor: '#2C7BE5',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
