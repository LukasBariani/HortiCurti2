// src/screens/ChartsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { getDashboardData } from '../services/api';

const { width } = Dimensions.get('window');

// Definindo os tipos corretamente
interface DailyRevenue {
  date: string;
  value: number;
}

interface WeeklyRevenue {
  week: string;
  value: number;
}

interface MonthlyRevenue {
  month: string;
  value: number;
}

type RevenueData = DailyRevenue | WeeklyRevenue | MonthlyRevenue;

interface DashboardData {
  dailyRevenue: DailyRevenue[];
  weeklyRevenue: WeeklyRevenue[];
  monthlyRevenue: MonthlyRevenue[];
  topProductsByVolume: { name: string; quantity: number; unit: string }[];
  topProductsByRevenue: { name: string; revenue: number }[];
  abcCurve: { name: string; percentage: number; cumulative: number }[];
  summary: {
    totalRevenue: number;
    totalOrders: number;
    averageTicket: number;
  };
}

export default function ChartsScreen() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<
    'daily' | 'weekly' | 'monthly'
  >('daily');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const dashboardData = await getDashboardData();
      setData(dashboardData);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2)}`;
  };

  // Função para obter os dados do período selecionado
  const getRevenueData = (): { label: string; value: number }[] => {
    if (!data) return [];

    let revenueData: RevenueData[] = [];
    switch (selectedPeriod) {
      case 'daily':
        revenueData = data.dailyRevenue;
        break;
      case 'weekly':
        revenueData = data.weeklyRevenue;
        break;
      case 'monthly':
        revenueData = data.monthlyRevenue;
        break;
      default:
        return [];
    }

    return revenueData.map((item) => {
      let label = '';
      if ('date' in item) {
        // DailyRevenue
        label = new Date(item.date).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        });
      } else if ('week' in item) {
        // WeeklyRevenue
        label = `Sem ${item.week}`;
      } else if ('month' in item) {
        // MonthlyRevenue
        label = new Date(item.month).toLocaleDateString('pt-BR', {
          month: 'short',
        });
      }
      return {
        label,
        value: item.value,
      };
    });
  };

  // Preparar dados para o gráfico de pizza (ABC)
  const getPieData = () => {
    if (!data?.abcCurve) return [];

    // Agrupar por categorias A, B, C
    const sorted = [...data.abcCurve].sort(
      (a, b) => b.percentage - a.percentage,
    );
    const total = sorted.reduce((sum, item) => sum + item.percentage, 0);

    let cumulative = 0;
    return sorted.map((item) => {
      cumulative += item.percentage;
      let color = '#10B981'; // A - Verde
      if (cumulative > 80)
        color = '#EF4444'; // C - Vermelho
      else if (cumulative > 50) color = '#F59E0B'; // B - Amarelo

      return {
        value: item.percentage,
        text: `${item.percentage.toFixed(1)}%`,
        color: color,
        label: item.name,
        focused: cumulative <= 80,
      };
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C7BE5" />
        <Text style={styles.loadingText}>Carregando dados...</Text>
      </View>
    );
  }

  const chartData = getRevenueData();
  const pieData = getPieData();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FA" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📊 Dashboard</Text>
          <Text style={styles.headerSubtitle}>Análise de Vendas</Text>
        </View>

        {/* Cards de Resumo */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {formatCurrency(data?.summary?.totalRevenue || 0)}
            </Text>
            <Text style={styles.summaryLabel}>💰 Faturamento Total</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {data?.summary?.totalOrders || 0}
            </Text>
            <Text style={styles.summaryLabel}>📦 Total de Pedidos</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {formatCurrency(data?.summary?.averageTicket || 0)}
            </Text>
            <Text style={styles.summaryLabel}>🎯 Ticket Médio</Text>
          </View>
        </View>

        {/* Gráfico de Faturamento */}
        <View style={styles.chartSection}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>📈 Faturamento</Text>
            <View style={styles.periodButtons}>
              <TouchableOpacity
                style={[
                  styles.periodButton,
                  selectedPeriod === 'daily' && styles.periodButtonActive,
                ]}
                onPress={() => setSelectedPeriod('daily')}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    selectedPeriod === 'daily' && styles.periodButtonTextActive,
                  ]}
                >
                  Dia
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.periodButton,
                  selectedPeriod === 'weekly' && styles.periodButtonActive,
                ]}
                onPress={() => setSelectedPeriod('weekly')}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    selectedPeriod === 'weekly' &&
                      styles.periodButtonTextActive,
                  ]}
                >
                  Semana
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.periodButton,
                  selectedPeriod === 'monthly' && styles.periodButtonActive,
                ]}
                onPress={() => setSelectedPeriod('monthly')}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    selectedPeriod === 'monthly' &&
                      styles.periodButtonTextActive,
                  ]}
                >
                  Mês
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {chartData.length > 0 ? (
            <View style={styles.chartContainer}>
              <BarChart
                data={chartData}
                barWidth={30}
                spacing={16}
                roundedTop
                roundedBottom
                hideRules
                frontColor="#2C7BE5"
                gradientColor="#4F9EFF"
                yAxisTextStyle={styles.chartLabel}
                xAxisLabelTextStyle={styles.chartLabel}
                showGradient
                isAnimated
                maxValue={
                  Math.max(...chartData.map((item) => item.value)) * 1.2
                }
              />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Sem dados para o período selecionado
              </Text>
            </View>
          )}
        </View>

        {/* Top Produtos por Volume */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>🏆 Top Produtos por Volume</Text>
          {data?.topProductsByVolume && data.topProductsByVolume.length > 0 ? (
            <>
              <View style={styles.chartContainer}>
                <BarChart
                  data={data.topProductsByVolume.slice(0, 5).map((item) => ({
                    value: item.quantity,
                    label:
                      item.name.length > 10
                        ? item.name.substring(0, 10) + '...'
                        : item.name,
                    frontColor: '#10B981',
                  }))}
                  barWidth={25}
                  spacing={12}
                  roundedTop
                  hideRules
                  yAxisTextStyle={styles.chartLabel}
                  xAxisLabelTextStyle={styles.chartLabel}
                  isAnimated
                  maxValue={
                    Math.max(
                      ...data.topProductsByVolume.map((item) => item.quantity),
                    ) * 1.2
                  }
                />
              </View>
              <View style={styles.legendContainer}>
                {data.topProductsByVolume.slice(0, 5).map((item, index) => (
                  <View key={index} style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendColor,
                        { backgroundColor: '#10B981' },
                      ]}
                    />
                    <Text style={styles.legendText}>
                      {item.name}: {item.quantity} {item.unit}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Dados insuficientes</Text>
            </View>
          )}
        </View>

        {/* Top Produtos por Faturamento */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>💰 Top Produtos por Faturamento</Text>
          {data?.topProductsByRevenue &&
          data.topProductsByRevenue.length > 0 ? (
            <>
              <View style={styles.chartContainer}>
                <BarChart
                  data={data.topProductsByRevenue.slice(0, 5).map((item) => ({
                    value: item.revenue,
                    label:
                      item.name.length > 10
                        ? item.name.substring(0, 10) + '...'
                        : item.name,
                    frontColor: '#F59E0B',
                  }))}
                  barWidth={25}
                  spacing={12}
                  roundedTop
                  hideRules
                  yAxisTextStyle={styles.chartLabel}
                  xAxisLabelTextStyle={styles.chartLabel}
                  isAnimated
                  maxValue={
                    Math.max(
                      ...data.topProductsByRevenue.map((item) => item.revenue),
                    ) * 1.2
                  }
                />
              </View>
              <View style={styles.legendContainer}>
                {data.topProductsByRevenue.slice(0, 5).map((item, index) => (
                  <View key={index} style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendColor,
                        { backgroundColor: '#F59E0B' },
                      ]}
                    />
                    <Text style={styles.legendText}>
                      {item.name}: {formatCurrency(item.revenue)}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Dados insuficientes</Text>
            </View>
          )}
        </View>

        {/* Curva ABC */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>📊 Curva ABC</Text>
          <Text style={styles.chartDescription}>
            Análise 80/20: 20% dos produtos geram 80% do faturamento
          </Text>

          {pieData.length > 0 ? (
            <View style={styles.pieContainer}>
              <PieChart
                data={pieData}
                donut
                innerRadius={60}
                radius={90}
                textColor="#1F2937"
                textSize={11}
                focusOnPress
                showValuesAsLabels
                centerLabelComponent={() => (
                  <View style={styles.centerLabel}>
                    <Text style={styles.centerLabelTitle}>ABC</Text>
                    <Text style={styles.centerLabelSub}>Análise</Text>
                  </View>
                )}
              />
              <View style={styles.abcLegend}>
                <View style={styles.abcLegendItem}>
                  <View
                    style={[styles.abcColor, { backgroundColor: '#10B981' }]}
                  />
                  <Text style={styles.abcText}>A (80% do faturamento)</Text>
                </View>
                <View style={styles.abcLegendItem}>
                  <View
                    style={[styles.abcColor, { backgroundColor: '#F59E0B' }]}
                  />
                  <Text style={styles.abcText}>B (15% do faturamento)</Text>
                </View>
                <View style={styles.abcLegendItem}>
                  <View
                    style={[styles.abcColor, { backgroundColor: '#EF4444' }]}
                  />
                  <Text style={styles.abcText}>C (5% do faturamento)</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Dados insuficientes para curva ABC
              </Text>
            </View>
          )}
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
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  summaryCard: {
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
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C7BE5',
  },
  summaryLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  chartSection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  chartDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  periodButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  periodButtonActive: {
    backgroundColor: '#2C7BE5',
  },
  periodButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  chartContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  chartLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  legendContainer: {
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 13,
    color: '#1F2937',
  },
  pieContainer: {
    alignItems: 'center',
  },
  centerLabel: {
    alignItems: 'center',
  },
  centerLabelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  centerLabelSub: {
    fontSize: 12,
    color: '#6B7280',
  },
  abcLegend: {
    marginTop: 16,
    width: '100%',
    paddingHorizontal: 16,
  },
  abcLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  abcColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  abcText: {
    fontSize: 14,
    color: '#1F2937',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
  },
});
