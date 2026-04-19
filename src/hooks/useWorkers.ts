'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import type { Worker, WorkRecord, LoanRecord } from '@/types';
import { calculateWage } from '@/lib/utils';

export function useWorkers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkers(data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const addWorker = async (worker: Omit<Worker, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase.from('workers').insert([worker]);
      if (error) throw error;
      await fetchWorkers();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const updateWorker = async (id: string, worker: Partial<Worker>) => {
    try {
      const { error } = await supabase
        .from('workers')
        .update({ ...worker, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      await fetchWorkers();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const deleteWorker = async (id: string) => {
    try {
      const { error } = await supabase.from('workers').delete().eq('id', id);
      if (error) throw error;
      await fetchWorkers();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const getWorkerWithDetails = async (id: string) => {
    try {
      const { data: worker, error: workerError } = await supabase
        .from('workers')
        .select('*')
        .eq('id', id)
        .single();
      if (workerError) throw workerError;

      const { data: workRecords } = await supabase
        .from('work_records')
        .select('*')
        .eq('worker_id', id)
        .order('date', { ascending: false });

      const { data: loanRecords } = await supabase
        .from('loan_records')
        .select('*')
        .eq('worker_id', id)
        .order('loan_date', { ascending: false });

      return { worker, workRecords: workRecords || [], loanRecords: loanRecords || [] };
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  return { workers, loading, error, fetchWorkers, addWorker, updateWorker, deleteWorker, getWorkerWithDetails };
}

export function useWorkRecords(filters?: { workerId?: string; startDate?: string; endDate?: string; isSettled?: boolean }) {
  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  const fetchRecords = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('work_records')
        .select('*, workers(name)')
        .order('date', { ascending: false });

      if (filters?.workerId) {
        query = query.eq('worker_id', filters.workerId);
      }
      if (filters?.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('date', filters.endDate);
      }
      if (filters?.isSettled !== undefined) {
        query = query.eq('is_settled', filters.isSettled);
      }

      const { data, error } = await query;
      if (error) throw error;

      const recordsWithWage = (data || []).map((record: any) => ({
        ...record,
        worker_name: record.workers?.name,
      }));
      setRecords(recordsWithWage);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const addRecord = async (record: Omit<WorkRecord, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase.from('work_records').insert([record]);
      if (error) throw error;
      await fetchRecords();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const updateRecord = async (id: string, record: Partial<WorkRecord>) => {
    try {
      const { error } = await supabase
        .from('work_records')
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
      const { error } = await supabase.from('work_records').delete().eq('id', id);
      if (error) throw error;
      await fetchRecords();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [filters?.workerId, filters?.startDate, filters?.endDate, filters?.isSettled]);

  return { records, loading, error, fetchRecords, addRecord, updateRecord, deleteRecord };
}

export function useLoanRecords(filters?: { workerId?: string; startDate?: string; endDate?: string }) {
  const [records, setRecords] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  const fetchRecords = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('loan_records')
        .select('*, workers(name)')
        .order('loan_date', { ascending: false });

      if (filters?.workerId) {
        query = query.eq('worker_id', filters.workerId);
      }
      if (filters?.startDate) {
        query = query.gte('loan_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('loan_date', filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      const recordsWithName = (data || []).map((record: any) => ({
        ...record,
        worker_name: record.workers?.name,
      }));
      setRecords(recordsWithName);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const addRecord = async (record: Omit<LoanRecord, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase.from('loan_records').insert([record]);
      if (error) throw error;
      await fetchRecords();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const updateRecord = async (id: string, record: Partial<LoanRecord>) => {
    try {
      const { error } = await supabase
        .from('loan_records')
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
      const { error } = await supabase.from('loan_records').delete().eq('id', id);
      if (error) throw error;
      await fetchRecords();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [filters?.workerId, filters?.startDate, filters?.endDate]);

  return { records, loading, error, fetchRecords, addRecord, updateRecord, deleteRecord };
}