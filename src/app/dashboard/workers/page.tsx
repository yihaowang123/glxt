'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase';
import { useWageSettings } from '@/hooks/useWageSettings';
import { formatCurrency, calculateWage } from '@/lib/utils';
import { Plus, Search, Users, Calculator, X } from 'lucide-react';
import type { Worker, WorkRecord, LoanRecord, SalarySettlement } from '@/types';

interface WorkerWithStats extends Worker {
  totalWage: number;
  settledWage: number;
  totalLoan: number;
  unsettledWage: number;
  unsettledCount: number;
  unsettledRecords: WorkRecord[];
}

export default function WorkersPage() {
  const router = useRouter();
  const supabase = createClient();
  const { settings } = useWageSettings();
  const [workers, setWorkers] = useState<WorkerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWorker, setNewWorker] = useState({ name: '', phone: '', age: '', job_type: '' });
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [showBatchSettlementModal, setShowBatchSettlementModal] = useState(false);
  const [workerPayments, setWorkerPayments] = useState<Record<string, string>>({});
  const [batchNotes, setBatchNotes] = useState('');
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split('T')[0]);
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    try {
      setLoading(true);
      const { data: workersData } = await supabase
        .from('workers')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: workRecordsData } = await supabase
        .from('work_records')
        .select('*');

      const { data: loanRecordsData } = await supabase
        .from('loan_records')
        .select('*');

      const { data: settlementsData } = await supabase
        .from('salary_settlements')
        .select('*');

      const blockPrice = settings?.block_price || 0;
      const packagePrice = settings?.package_price || 0;

      const workersWithStats: WorkerWithStats[] = (workersData || []).map(worker => {
        const workerWorkRecords = (workRecordsData || []).filter(r => r.worker_id === worker.id);
        const workerLoanRecords = (loanRecordsData || []).filter(r => r.worker_id === worker.id);
        const workerSettlements = (settlementsData || []).filter(s => s.worker_id === worker.id);

        const unsettledRecords = workerWorkRecords.filter(r => !r.is_settled);
        const totalWage = unsettledRecords.reduce((sum, record) => {
          return sum + calculateWage(record.blocks, record.packages, blockPrice, packagePrice);
        }, 0);

        const settledWage = workerSettlements.reduce((sum, s) => sum + s.actual_payment, 0);
        const totalLoan = workerLoanRecords.reduce((sum, r) => sum + r.amount, 0);
        const unsettledWage = totalWage - settledWage - totalLoan;

        return {
          ...worker,
          totalWage,
          settledWage,
          totalLoan,
          unsettledWage,
          unsettledCount: unsettledRecords.length,
          unsettledRecords,
        };
      });

      setWorkers(workersWithStats);
    } catch (error) {
      console.error('Failed to load workers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWorker = async () => {
    if (!newWorker.name.trim()) return;
    try {
      const { error } = await supabase
        .from('workers')
        .insert([{
          name: newWorker.name,
          phone: newWorker.phone || null,
          age: newWorker.age ? parseInt(newWorker.age) : null,
          job_type: newWorker.job_type || null,
        }]);

      if (error) throw error;
      setShowAddModal(false);
      setNewWorker({ name: '', phone: '', age: '', job_type: '' });
      loadWorkers();
    } catch (error) {
      console.error('Failed to add worker:', error);
    }
  };

  const handleWorkerClick = (workerId: string) => {
    router.push(`/dashboard/workers/${workerId}`);
  };

  const toggleSelectWorker = (workerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedWorkers(prev =>
      prev.includes(workerId)
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedWorkers.length === filteredWorkers.length) {
      setSelectedWorkers([]);
    } else {
      setSelectedWorkers(filteredWorkers.map(w => w.id));
    }
  };

  const openBatchSettlement = () => {
    if (selectedWorkers.length === 0) return;

    const payments: Record<string, string> = {};
    selectedWorkers.forEach(id => {
      const worker = workers.find(w => w.id === id);
      if (worker) {
        payments[id] = Math.max(0, worker.unsettledWage).toString();
      }
    });
    setWorkerPayments(payments);
    setShowBatchSettlementModal(true);
  };

  const handleBatchSettlement = async () => {
    if (selectedWorkers.length === 0) return;

    setSettling(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const workerId of selectedWorkers) {
        const worker = workers.find(w => w.id === workerId);
        if (!worker) continue;

        const actualPayment = parseFloat(workerPayments[workerId]) || 0;

        if (actualPayment <= 0) {
          failCount++;
          continue;
        }

        try {
          const { error: settlementError } = await supabase
            .from('salary_settlements')
            .insert([{
              worker_id: workerId,
              settlement_date: settlementDate,
              total_wage: worker.totalWage,
              total_loan: worker.totalLoan,
              actual_payment: actualPayment,
              work_records: worker.unsettledRecords.map(r => r.id),
              notes: batchNotes || '批量结算',
            }]);

          if (settlementError) throw settlementError;

          for (const record of worker.unsettledRecords) {
            const { error: updateError } = await supabase
              .from('work_records')
              .update({
                is_settled: true,
                settled_at: new Date().toISOString(),
              })
              .eq('id', record.id);

            if (updateError) throw updateError;
          }

          successCount++;
        } catch (error) {
          console.error(`Failed to settle worker ${workerId}:`, error);
          failCount++;
        }
      }

      alert(`结算完成！成功: ${successCount}个，失败: ${failCount}个`);
      setShowBatchSettlementModal(false);
      setSelectedWorkers([]);
      setWorkerPayments({});
      setBatchNotes('');
      loadWorkers();
    } catch (error) {
      console.error('Batch settlement error:', error);
      alert('结算过程中出错');
    } finally {
      setSettling(false);
    }
  };

  const getTotalUnsettledWage = () => {
    return selectedWorkers.reduce((sum, id) => {
      const worker = workers.find(w => w.id === id);
      return sum + (worker ? Math.max(0, worker.unsettledWage) : 0);
    }, 0);
  };

  const getTotalActualPayment = () => {
    return selectedWorkers.reduce((sum, id) => {
      return sum + (parseFloat(workerPayments[id]) || 0);
    }, 0);
  };

  const filteredWorkers = workers.filter(worker =>
    worker.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4">
      <div className="mb-4 flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <Input
            placeholder="搜索工人姓名..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 mobile-touch-target"
          />
        </div>
        <Button onClick={() => setShowAddModal(true)} size="icon" className="mobile-touch-target">
          <Plus size={20} />
        </Button>
      </div>

      <Button onClick={loadWorkers} variant="outline" className="w-full mb-4 mobile-touch-target">
        刷新数据
      </Button>

      {selectedWorkers.length > 0 && (
        <div className="mb-4 p-3 bg-primary/10 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">已选择 {selectedWorkers.length} 个工人</span>
            <button onClick={() => setSelectedWorkers([])} className="text-gray-500">
              <X size={18} />
            </button>
          </div>
          <div className="flex gap-2">
            <Button onClick={openBatchSettlement} size="sm" className="flex-1 mobile-touch-target">
              <Calculator className="mr-1" size={16} />
              一键结清 ({formatCurrency(getTotalUnsettledWage())})
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-gray-500">加载中...</div>
        </div>
      ) : filteredWorkers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Users size={48} className="mb-4 opacity-50" />
          <p>暂无工人数据</p>
          <Button onClick={() => setShowAddModal(true)} className="mt-4">
            添加第一个工人
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={selectedWorkers.length === filteredWorkers.length && filteredWorkers.length > 0}
              onChange={toggleSelectAll}
              className="w-5 h-5"
            />
            <span className="text-sm text-gray-600">全选</span>
          </div>
          {filteredWorkers.map((worker) => (
            <Card
              key={worker.id}
              className={`cursor-pointer hover:shadow-md transition-shadow ${selectedWorkers.includes(worker.id) ? 'ring-2 ring-primary' : ''}`}
              onClick={() => handleWorkerClick(worker.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedWorkers.includes(worker.id)}
                    onChange={() => {}}
                    onClick={(e) => toggleSelectWorker(worker.id, e)}
                    className="w-5 h-5 mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{worker.name}</h3>
                        <p className="text-sm text-gray-500">
                          {worker.job_type || '未设置工种'}
                        </p>
                        <div className="mt-1 text-sm text-gray-600">
                          <span>电话: {worker.phone || '未填写'}</span>
                          <span className="ml-2">年龄: {worker.age || '未填写'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-amber-600">
                          {formatCurrency(worker.unsettledWage)}
                        </p>
                        <p className="text-xs text-gray-500">未结算工资</p>
                        {worker.unsettledCount > 0 && (
                          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                            {worker.unsettledCount}条待结算
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>添加工人</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">姓名 *</label>
                <Input
                  value={newWorker.name}
                  onChange={(e) => setNewWorker({ ...newWorker, name: e.target.value })}
                  placeholder="请输入姓名"
                  className="mobile-touch-target"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">电话</label>
                <Input
                  value={newWorker.phone}
                  onChange={(e) => setNewWorker({ ...newWorker, phone: e.target.value })}
                  placeholder="请输入电话"
                  className="mobile-touch-target"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">年龄</label>
                <Input
                  type="number"
                  value={newWorker.age}
                  onChange={(e) => setNewWorker({ ...newWorker, age: e.target.value })}
                  placeholder="请输入年龄"
                  className="mobile-touch-target"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">工种</label>
                <Input
                  value={newWorker.job_type}
                  onChange={(e) => setNewWorker({ ...newWorker, job_type: e.target.value })}
                  placeholder="请输入工种"
                  className="mobile-touch-target"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1 mobile-touch-target">
                  取消
                </Button>
                <Button onClick={handleAddWorker} className="flex-1 mobile-touch-target">
                  保存
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showBatchSettlementModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>批量工资结算</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">结算日期</label>
                <Input
                  type="date"
                  value={settlementDate}
                  onChange={(e) => setSettlementDate(e.target.value)}
                  className="mobile-touch-target"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">备注</label>
                <Input
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  placeholder="如：2025年底工资结算"
                  className="mobile-touch-target"
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <p className="text-sm font-medium">选中工人清单：</p>
                {selectedWorkers.map(id => {
                  const worker = workers.find(w => w.id === id);
                  if (!worker) return null;
                  return (
                    <div key={id} className="flex items-center justify-between text-sm">
                      <span>{worker.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">未结算: {formatCurrency(Math.max(0, worker.unsettledWage))}</span>
                        <Input
                          type="number"
                          value={workerPayments[id] || '0'}
                          onChange={(e) => setWorkerPayments({ ...workerPayments, [id]: e.target.value })}
                          className="w-24 h-8"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-amber-600">未结算工资总计</span>
                  <span className="text-lg font-bold text-amber-600">{formatCurrency(getTotalUnsettledWage())}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-green-600">实际发放总计</span>
                  <span className="text-lg font-bold text-green-600">{formatCurrency(getTotalActualPayment())}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowBatchSettlementModal(false)} className="flex-1 mobile-touch-target" disabled={settling}>
                  取消
                </Button>
                <Button onClick={handleBatchSettlement} className="flex-1 mobile-touch-target" disabled={settling}>
                  {settling ? '结算中...' : '确认结算'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}