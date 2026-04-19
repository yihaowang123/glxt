'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase';
import { exportWorkersToExcel, exportLoanRecordsToExcel, exportWorkRecordsToExcel, exportMaterialRecordsToExcel } from '@/lib/excel';
import { FileDown, Search } from 'lucide-react';
import type { MaterialType, Worker, WorkRecord, LoanRecord, MaterialRecord, SalarySettlement } from '@/types';

const modules = [
  { value: 'workers', label: '工人详情' },
  { value: 'loans', label: '借资记录' },
  { value: 'work_unsettled', label: '工作记录（未结算）' },
  { value: 'work_settled', label: '工作记录（已结算）' },
  { value: 'settlements', label: '工资结算' },
  { value: 'cement', label: '水泥' },
  { value: 'sand', label: '砂石料' },
  { value: 'freight', label: '运费明细' },
  { value: 'external_brick', label: '外调砖' },
  { value: 'internal_brick', label: '内调砖' },
  { value: 'site_supply', label: '工地供货明细' },
];

export default function ExportPage() {
  const supabase = createClient();
  const [selectedModule, setSelectedModule] = useState('workers');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchText, setSearchText] = useState('');
  const [exporting, setExporting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [resultCount, setResultCount] = useState(0);

  const handleSearch = async () => {
    setSearching(true);
    try {
      const dateRange = startDate && endDate ? { start: startDate, end: endDate } : undefined;
      let results: any[] = [];
      let count = 0;

      switch (selectedModule) {
        case 'workers': {
          let query = supabase.from('workers').select('*');
          if (searchText) {
            query = query.ilike('name', `%${searchText}%`);
          }
          const { data } = await query;
          results = data || [];
          count = results.length;
          break;
        }

        case 'loans': {
          let query = supabase
            .from('loan_records')
            .select('*, workers(name)')
            .order('loan_date', { ascending: false });

          if (searchText) {
            query = query.ilike('workers.name', `%${searchText}%`);
          }
          if (dateRange) {
            query = query.gte('loan_date', dateRange.start).lte('loan_date', dateRange.end);
          }
          const { data } = await query;
          results = (data || []).map(r => ({ ...r, worker_name: r.workers?.name }));
          count = results.length;
          break;
        }

        case 'work_unsettled':
        case 'work_settled': {
          const isSettled = selectedModule === 'work_settled';
          let query = supabase
            .from('work_records')
            .select('*, workers(name)')
            .eq('is_settled', isSettled)
            .order('date', { ascending: false });

          if (searchText) {
            query = query.ilike('workers.name', `%${searchText}%`);
          }
          if (dateRange) {
            query = query.gte('date', dateRange.start).lte('date', dateRange.end);
          }
          const { data } = await query;
          results = (data || []).map(r => ({ ...r, worker_name: r.workers?.name }));
          count = results.length;
          break;
        }

        case 'settlements': {
          let query = supabase
            .from('salary_settlements')
            .select('*, workers(name)')
            .order('settlement_date', { ascending: false });

          if (searchText) {
            query = query.ilike('workers.name', `%${searchText}%`);
          }
          if (dateRange) {
            query = query.gte('settlement_date', dateRange.start).lte('settlement_date', dateRange.end);
          }
          const { data } = await query;
          results = (data || []).map(r => ({ ...r, worker_name: r.workers?.name }));
          count = results.length;
          break;
        }

        default: {
          if (['cement', 'sand', 'freight', 'external_brick', 'internal_brick', 'site_supply'].includes(selectedModule)) {
            let query = supabase
              .from('material_records')
              .select('*')
              .eq('type', selectedModule)
              .order('date', { ascending: false });

            if (searchText) {
              query = query.or(`name.ilike.%${searchText}%,worker_name.ilike.%${searchText}%`);
            }
            if (dateRange) {
              query = query.gte('date', dateRange.start).lte('date', dateRange.end);
            }
            const { data } = await query;
            results = data || [];
            count = results.length;
          }
          break;
        }
      }

      setSearchResults(results);
      setResultCount(count);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const dateRange = startDate && endDate ? { start: startDate, end: endDate } : undefined;

      switch (selectedModule) {
        case 'workers': {
          const { data: workersData } = await supabase.from('workers').select('*');
          const workers = workersData || [];

          const workRecordsMap = new Map<string, WorkRecord[]>();
          const loanRecordsMap = new Map<string, LoanRecord[]>();
          const settlementsMap = new Map<string, SalarySettlement[]>();

          for (const worker of workers) {
            const { data: workRecords } = await supabase
              .from('work_records')
              .select('*')
              .eq('worker_id', worker.id);
            workRecordsMap.set(worker.id, workRecords || []);

            const { data: loanRecords } = await supabase
              .from('loan_records')
              .select('*')
              .eq('worker_id', worker.id);
            loanRecordsMap.set(worker.id, loanRecords || []);

            const { data: settlements } = await supabase
              .from('salary_settlements')
              .select('*')
              .eq('worker_id', worker.id);
            settlementsMap.set(worker.id, settlements || []);
          }

          await exportWorkersToExcel(
            workers,
            workRecordsMap,
            loanRecordsMap,
            settlementsMap,
            dateRange
          );
          break;
        }

        case 'loans': {
          const { data } = await supabase
            .from('loan_records')
            .select('*, workers(name)')
            .order('loan_date', { ascending: false });
          const records = (data || []).map(r => ({ ...r, worker_name: r.workers?.name }));
          await exportLoanRecordsToExcel(records, dateRange);
          break;
        }

        case 'work_unsettled':
        case 'work_settled': {
          const isSettled = selectedModule === 'work_settled';
          const { data } = await supabase
            .from('work_records')
            .select('*, workers(name)')
            .eq('is_settled', isSettled)
            .order('date', { ascending: false });
          const records = (data || []).map(r => ({ ...r, worker_name: r.workers?.name }));
          await exportWorkRecordsToExcel(records, isSettled, dateRange);
          break;
        }

        case 'settlements': {
          const { data } = await supabase
            .from('salary_settlements')
            .select('*, workers(name)')
            .order('settlement_date', { ascending: false });
          const records = (data || []).map(r => ({ ...r, worker_name: r.workers?.name }));
          await exportLoanRecordsToExcel(records, dateRange);
          break;
        }

        default: {
          if (['cement', 'sand', 'freight', 'external_brick', 'internal_brick', 'site_supply'].includes(selectedModule)) {
            const { data } = await supabase
              .from('material_records')
              .select('*')
              .eq('type', selectedModule)
              .order('date', { ascending: false });
            const records = data || [];
            const imageUrls = new Map<string, string>();
            records.forEach(r => {
              if (r.photo_url) {
                imageUrls.set(r.id, r.photo_url);
              }
            });
            await exportMaterialRecordsToExcel(records, selectedModule, dateRange, imageUrls);
          }
          break;
        }
      }

      alert('导出成功！');
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  };

  const renderSearchResultItem = (item: any, index: number) => {
    switch (selectedModule) {
      case 'workers':
        return (
          <div key={item.id || index} className="p-3 border-b last:border-b-0">
            <p className="font-medium">{item.name}</p>
            <p className="text-sm text-gray-500">{item.job_type || '未设置工种'}</p>
          </div>
        );
      case 'loans':
        return (
          <div key={item.id || index} className="p-3 border-b last:border-b-0">
            <p className="font-medium">{item.worker_name}</p>
            <p className="text-sm text-gray-500">{item.loan_date} | {item.amount}元</p>
            {item.reason && <p className="text-sm text-gray-400">{item.reason}</p>}
          </div>
        );
      case 'work_unsettled':
      case 'work_settled':
        return (
          <div key={item.id || index} className="p-3 border-b last:border-b-0">
            <p className="font-medium">{item.worker_name}</p>
            <p className="text-sm text-gray-500">{item.date} | 块:{item.blocks} 包:{item.packages}</p>
            <p className="text-sm text-gray-400">{item.spec || '无规格'}</p>
          </div>
        );
      case 'settlements':
        return (
          <div key={item.id || index} className="p-3 border-b last:border-b-0">
            <p className="font-medium">{item.worker_name}</p>
            <p className="text-sm text-gray-500">{item.settlement_date} | 发放:{item.actual_payment}元</p>
          </div>
        );
      default:
        return (
          <div key={item.id || index} className="p-3 border-b last:border-b-0">
            <p className="font-medium">{item.name}</p>
            <p className="text-sm text-gray-500">{item.worker_name || '无'} | {item.date}</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold">数据导出</h1>
        </div>
      </header>

      <main className="p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">选择导出模块</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={selectedModule}
              onChange={(e) => {
                setSelectedModule(e.target.value);
                setSearchResults([]);
                setResultCount(0);
              }}
              className="w-full h-12 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {modules.map((module) => (
                <option key={module.value} value={module.value}>
                  {module.label}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">日期区间（可选）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-sm text-gray-500">开始日期</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mobile-touch-target"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-gray-500">结束日期</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mobile-touch-target"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">搜索（可选）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <Input
                placeholder="输入关键词搜索..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-10 mobile-touch-target"
              />
            </div>
            <Button onClick={handleSearch} disabled={searching} className="w-full mobile-touch-target">
              {searching ? '搜索中...' : '搜索'}
            </Button>
          </CardContent>
        </Card>

        {resultCount > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">搜索结果 ({resultCount} 条)</CardTitle>
            </CardHeader>
            <CardContent className="max-h-64 overflow-y-auto">
              {searchResults.map(renderSearchResultItem)}
            </CardContent>
          </Card>
        )}

        <Button
          onClick={handleExport}
          disabled={exporting}
          className="w-full mobile-touch-target text-lg py-6"
        >
          <FileDown className="mr-2" size={24} />
          {exporting ? '导出中...' : '导出Excel'}
        </Button>

        <div className="text-sm text-gray-500 text-center">
          <p>导出的Excel文件将自动下载</p>
          <p className="mt-1">支持图片直接插入Excel</p>
        </div>
      </main>
    </div>
  );
}