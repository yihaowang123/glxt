'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Search, ChevronDown, Loader2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface SearchNameInputProps {
  value: string;
  onChange: (value: string) => void;
  materialType?: string;
}

export function SearchNameInput({ value, onChange, materialType }: SearchNameInputProps) {
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
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, materialType]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('material_records')
        .select('worker_name')
        .not('worker_name', 'is', null)
        .not('worker_name', 'eq', '')
        .order('created_at', { ascending: false });

      if (materialType) {
        query = query.eq('type', materialType);
      }

      const { data, error } = await query;

      if (error) throw error;

      const uniqueNames = [...new Set(data?.map(r => r.worker_name).filter(Boolean) as string[])];
      setSuggestions(uniqueNames);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (name: string) => {
    setInputValue(name);
    onChange(name);
    setIsOpen(false);
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
    <div className="relative" ref={wrapperRef}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
      <Input
        placeholder="搜索姓名或名称..."
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        className="pl-10 mobile-touch-target pr-20"
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
