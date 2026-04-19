'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import type { MaterialRecord, MaterialType } from '@/types';

export function useMaterialRecords(
  materialType?: MaterialType,
  filters?: { name?: string; startDate?: string; endDate?: string }
) {
  const [records, setRecords] = useState<MaterialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  const fetchRecords = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('material_records')
        .select('*')
        .order('date', { ascending: false });

      if (materialType) {
        query = query.eq('type', materialType);
      }
      if (filters?.name) {
        query = query.ilike('name', `%${filters.name}%`);
      }
      if (filters?.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('date', filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const addRecord = async (record: Omit<MaterialRecord, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase.from('material_records').insert([record]);
      if (error) throw error;
      await fetchRecords();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const updateRecord = async (id: string, record: Partial<MaterialRecord>) => {
    try {
      const { error } = await supabase
        .from('material_records')
        .update({ ...record, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      await fetchRecords();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const deleteRecord = async (id: string) => {
    try {
      const { error } = await supabase.from('material_records').delete().eq('id', id);
      if (error) throw error;
      await fetchRecords();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [materialType, filters?.name, filters?.startDate, filters?.endDate]);

  return { records, loading, error, fetchRecords, addRecord, updateRecord, deleteRecord };
}