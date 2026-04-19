'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import type { WageSettings } from '@/types';

export function useWageSettings() {
  const [settings, setSettings] = useState<WageSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('wage_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (blockPrice: number, packagePrice: number) => {
    try {
      const { error } = await supabase
        .from('wage_settings')
        .update({
          block_price: blockPrice,
          package_price: packagePrice,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings?.id);

      if (error) throw error;
      await fetchSettings();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return { settings, loading, error, updateSettings, refetch: fetchSettings };
}