'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { ChevronDown, Loader2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import type { MaterialRecord } from '@/types';

interface WorkerNameInputProps {
  value: string;
  onChange: (value: string) => void;
  onAutoFill?: (data: Partial<MaterialRecord>) => void;
  placeholder?: string;
}

export function WorkerNameInput({ value, onChange, onAutoFill, placeholder = '请输入或选择姓名' }: WorkerNameInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputValue.length >= 0) {
      fetchHistory();
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('material_records')
        .select('worker_name, name, spec, color, unit_price, unit_price_1, unit_price_2')
        .not('worker_name', 'is', null)
        .not('worker_name', 'eq', '')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const uniqueNames = [...new Set(data?.map(r => r.worker_name).filter(Boolean) as string[])];
      setSuggestions(uniqueNames);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = async (name: string) => {
    setInputValue(name);
    onChange(name);
    setIsOpen(false);

    if (onAutoFill) {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('material_records')
          .select('name, spec, color, unit_price, unit_price_1, unit_price_2')
          .eq('worker_name', name)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) throw error;

        if (data) {
          const fillData: Partial<MaterialRecord> = {};
          if (data.name) fillData.name = data.name;
          if (data.spec) fillData.spec = data.spec;
          if (data.color) fillData.color = data.color;
          if (data.unit_price) fillData.unit_price = data.unit_price;
          if (data.unit_price_1) fillData.unit_price_1 = data.unit_price_1;
          if (data.unit_price_2) fillData.unit_price_2 = data.unit_price_2;
          onAutoFill(fillData);
        }
      } catch (error) {
        console.error('Failed to fetch auto-fill data:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setIsOpen(false);
  };

  const handleClear = () => {
    setInputValue('');
    onChange('');
    setSuggestions([]);
  };

  const filteredSuggestions = suggestions.filter(name =>
    name.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className="space-y-2" ref={wrapperRef}>
      <label className="text-sm font-medium">姓名</label>
      <div className="relative">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="mobile-touch-target pr-10"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {inputValue && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-muted rounded"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 hover:bg-muted rounded"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-auto border rounded-md bg-background shadow-lg">
          {isLoading && suggestions.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground">加载中...</div>
          ) : filteredSuggestions.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground">无历史记录</div>
          ) : (
            <div className="py-1">
              {filteredSuggestions.map((name, index) => (
                <button
                  key={`${name}-${index}`}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted cursor-pointer"
                  onClick={() => handleSelect(name)}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
