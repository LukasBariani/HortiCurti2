import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { todayInSaoPaulo } from '../utils/deliveryDate';

export function useDeliveryData<T>(load: (date: string) => Promise<T[]>) {
  const [today, setToday] = useState(todayInSaoPaulo);
  const [selection, setSelection] = useState<string | null>(null);
  const date = selection ?? today;
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef(0);
  const setDate = (next: string) => {
    request.current++;
    setData([]);
    setLoading(true);
    const currentDay = todayInSaoPaulo();
    setToday(currentDay);
    setSelection(next === currentDay ? null : next);
    if (next === currentDay && selection === null) void refresh();
  };
  const refresh = useCallback(async () => {
    const id = ++request.current;
    const currentDay = todayInSaoPaulo();
    setToday(currentDay);
    setLoading(true);
    setError('');
    setData([]);
    try {
      const result = await load(selection ?? currentDay);
      if (id === request.current) setData(result);
    } catch {
      if (id === request.current) setError('Não foi possível carregar as entregas. Toque em Atualizar para tentar novamente.');
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [selection, load]);
  useFocusEffect(useCallback(() => {
    void refresh();
    return () => { request.current++; };
  }, [refresh]));
  return { date, setDate, data, setData, loading, error, refresh };
}
