'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@/lib/supabase';
import { useWageSettings } from '@/hooks/useWageSettings';
import { formatCurrency, formatDate, calculateWage } from '@/lib/utils';
import { ArrowLeft, Edit2, Trash2, Calculator } from 'lucide-react';
import type { Worker, WorkRecord, LoanRecord, SalarySettlement } from '@/types';

export default function WorkerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const workerId = params.id as string;
  const supabase = createClient();

  const { settings } = useWageSettings();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [workRecords, setWorkRecords] = useState<WorkRecord[]>([]);
  const [loanRecords, setLoanRecords] = useState<LoanRecord[]>([]);
  const [salarySettlements, setSalarySettlements] = useState<SalarySettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', age: '', job_type: '' });
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [settlementAmount, setSettlementAmount] = useState('');
  const [editingWorkRecord, setEditingWorkRecord] = useState<WorkRecord | null>(null);
  const [editingLoanRecord, setEditingLoanRecord] = useState<LoanRecord | null>(null);
  const [showAddWorkModal, setShowAddWorkModal] = useState(false);
  const [showAddLoanModal, setShowAddLoanModal] = useState(false);
  const [newWorkForm, setNewWorkForm] = useState({ date: '', blocks: '', packages: '', spec: '' });
  const [newLoanForm, setNewLoanForm] = useState({ loan_date: '', amount: '', reason: '' });

  useEffect(() => {
    loadData();
  }, [workerId]);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: workerData, error: workerError } = await supabase
        .from('workers')
        .select('*')
        .eq('id', workerId)
        .single();

      if (workerError) throw workerError;
      setWorker(workerData);
      setEditForm({
        name: workerData.name,
        phone: workerData.phone || '',
        age: workerData.age?.toString() || '',
        job_type: workerData.job_type || '',
      });

      const { data: workData } = await supabase
        .from('work_records')
        .select('*')
        .eq('worker_id', workerId)
        .order('date', { ascending: false });

      const { data: loanData } = await supabase
        .from('loan_records')
        .select('*')
        .eq('worker_id', workerId)
        .order('loan_date', { ascending: false });

      const { data: settlementData } = await supabase
        .from('salary_settlements')
        .select('*')
        .eq('worker_id', workerId)
        .order('settlement_date', { ascending: false });

      setWorkRecords(workData || []);
      setLoanRecords(loanData || []);
      setSalarySettlements(settlementData || []);
    } catch (error) {
      console.error('Failed to load worker details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWorker = async () => {
    try {
      const { error } = await supabase
        .from('workers')
        .update({
          name: editForm.name,
          phone: editForm.phone || null,
          age: editForm.age ? parseInt(editForm.age) : null,
          job_type: editForm.job_type || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workerId);

      if (error) throw error;
      setEditing(false);
      loadData();
    } catch (error) {
      console.error('Failed to update worker:', error);
    }
  };

  const handleDeleteWorker = async () => {
    if (confirm('确定要删除这个工人吗？所有相关的工作记录和借资记录也会被删除。')) {
      try {
        const { error } = await supabase.from('workers').delete().eq('id', workerId);
        if (error) throw error;
        router.push('/dashboard/workers');
      } catch (error) {
        console.error('Failed to delete worker:', error);
      }
    }
  };

  const calculateStats = () => {
    const blockPrice = settings?.block_price || 0;
    const packagePrice = settings?.package_price || 0;

    const unsettledRecords = workRecords.filter(r => !r.is_settled);
    const totalWage = unsettledRecords.reduce((sum, record) => {
      return sum + calculateWage(record.blocks, record.packages, blockPrice, packagePrice);
    }, 0);

    const totalLoan = loanRecords.reduce((sum, record) => sum + record.amount, 0);
    const settledWage = salarySettlements.reduce((sum, s) => sum + s.actual_payment, 0);
    const unsettledWage = totalWage - settledWage - totalLoan;

    return { totalWage, totalLoan, settledWage, unsettledWage };
  };

  const { totalWage, totalLoan, settledWage, unsettledWage } = calculateStats();

  const unsettledRecords = workRecords.filter(r => !r.is_settled);
  const settledRecords = workRecords.filter(r => r.is_settled);

  const toggleSelectRecord = (recordId: string) => {
    setSelectedRecords(prev =>
      prev.includes(recordId)
        ? prev.filter(id => id !== recordId)
        : [...prev, recordId]
    );
  };

  const handleSettleAll = () => {
    const allUnsettledIds = unsettledRecords.map(r => r.id);
    setSelectedRecords(allUnsettledIds);
    const totalUnsettled = unsettledRecords.reduce((sum, r) => {
      return sum + calculateWage(r.blocks, r.packages, settings?.block_price || 0, settings?.package_price || 0);
    }, 0);
    setSettlementAmount(totalUnsettled.toString());
    setShowSettlementModal(true);
  };

  const handleConfirmSettlement = async () => {
    try {
      const selectedWage = selectedRecords.reduce((sum, id) => {
        const record = workRecords.find(r => r.id === id);
        if (record) {
          return sum + calculateWage(record.blocks, record.packages, settings?.block_price || 0, settings?.package_price || 0);
        }
        return sum;
      }, 0);

      const { error: settlementError } = await supabase
        .from('salary_settlements')
        .insert([{
          worker_id: workerId,
          settlement_date: new Date().toISOString().split('T')[0],
          total_wage: selectedWage,
          total_loan: totalLoan,
          actual_payment: parseFloat(settlementAmount) || selectedWage,
          work_records: selectedRecords,
          notes: '',
        }]);

      if (settlementError) throw settlementError;

      for (const recordId of selectedRecords) {
        const { error: updateError } = await supabase
          .from('work_records')
          .update({
            is_settled: true,
            settled_at: new Date().toISOString(),
          })
          .eq('id', recordId);

        if (updateError) throw updateError;
      }

      setShowSettlementModal(false);
      setSelectedRecords([]);
      setSettlementAmount('');
      loadData();
    } catch (error) {
      console.error('Failed to settle:', error);
      alert('结算失败，请稍后重试');
    }
  };

  const handleEditWorkRecord = (record: WorkRecord) => {
    setEditingWorkRecord(record);
    setNewWorkForm({
      date: record.date,
      blocks: record.blocks.toString(),
      packages: record.packages.toString(),
      spec: record.spec || '',
    });
  };

  const handleSaveWorkRecord = async () => {
    try {
      if (editingWorkRecord) {
        const { error } = await supabase
          .from('work_records')
          .update({
            date: newWorkForm.date,
            blocks: parseInt(newWorkForm.blocks) || 0,
            packages: parseInt(newWorkForm.packages) || 0,
            spec: newWorkForm.spec || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingWorkRecord.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('work_records')
          .insert([{
            worker_id: workerId,
            date: newWorkForm.date || new Date().toISOString().split('T')[0],
            blocks: parseInt(newWorkForm.blocks) || 0,
            packages: parseInt(newWorkForm.packages) || 0,
            spec: newWorkForm.spec || null,
            is_settled: false,
          }]);

        if (error) throw error;
      }

      setEditingWorkRecord(null);
      setShowAddWorkModal(false);
      setNewWorkForm({ date: '', blocks: '', packages: '', spec: '' });
      loadData();
    } catch (error) {
      console.error('Failed to save work record:', error);
    }
  };

  const handleDeleteWorkRecord = async (id: string) => {
    if (!confirm('确定要删除这条工作记录吗？')) return;
    try {
      const { error } = await supabase.from('work_records').delete().eq('id', id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Failed to delete work record:', error);
    }
  };

  const handleEditLoanRecord = (record: LoanRecord) => {
    setEditingLoanRecord(record);
    setNewLoanForm({
      loan_date: record.loan_date,
      amount: record.amount.toString(),
      reason: record.reason || '',
    });
  };

  const handleSaveLoanRecord = async () => {
    try {
      if (editingLoanRecord) {
        const { error } = await supabase
          .from('loan_records')
          .update({
            loan_date: newLoanForm.loan_date,
            amount: parseFloat(newLoanForm.amount) || 0,
            reason: newLoanForm.reason || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingLoanRecord.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('loan_records')
          .insert([{
            worker_id: workerId,
            loan_date: newLoanForm.loan_date || new Date().toISOString().split('T')[0],
            amount: parseFloat(newLoanForm.amount) || 0,
            reason: newLoanForm.reason || null,
          }]);

        if (error) throw error;
      }

      setEditingLoanRecord(null);
      setShowAddLoanModal(false);
      setNewLoanForm({ loan_date: '', amount: '', reason: '' });
      loadData();
    } catch (error) {
      console.error('Failed to save loan record:', error);
    }
  };

  const handleDeleteLoanRecord = async (id: string) => {
    if (!confirm('确定要删除这条借资记录吗？')) return;
    try {
      const { error } = await supabase.from('loan_records').delete().eq('id', id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Failed to delete loan record:', error);
    }
  };

  const handleDeleteSettlement = async (settlementId: string, workRecordIds: string[]) => {
    if (!confirm('确定要删除这条结算记录吗？删除后关联的工作记录将恢复为未结算状态。')) return;

    try {
      for (const recordId of workRecordIds) {
        const { error: updateError } = await supabase
          .from('work_records')
          .update({
            is_settled: false,
            settled_at: null,
          })
          .eq('id', recordId);

        if (updateError) throw updateError;
      }

      const { error: deleteError } = await supabase
        .from('salary_settlements')
        .delete()
        .eq('id', settlementId);

      if (deleteError) throw deleteError;

      alert('结算记录已删除，关联工作记录已恢复为未结算状态');
      loadData();
    } catch (error) {
      console.error('Failed to delete settlement:', error);
      alert('删除失败，请稍后重试');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">工人不存在</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="mobile-touch-target">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-bold flex-1">{worker.name}</h1>
          <button onClick={() => setEditing(true)} className="mobile-touch-target">
            <Edit2 size={20} />
          </button>
          <button onClick={handleDeleteWorker} className="mobile-touch-target text-red-500">
            <Trash2 size={20} />
          </button>
        </div>
      </header>

      <main className="p-4 space-y-4">
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">电话</p>
                <p className="font-medium">{worker.phone || '未填写'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">年龄</p>
                <p className="font-medium">{worker.age || '未填写'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">工种</p>
                <p className="font-medium">{worker.job_type || '未设置'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-500">应发工资</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(totalWage)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">已结算</p>
                <p className="text-xl font-semibold text-green-600">{formatCurrency(settledWage)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">未结算</p>
                <p className="text-xl font-semibold text-amber-600">{formatCurrency(unsettledWage)}</p>
              </div>
            </div>
            <div className="mt-2 text-center text-sm text-red-500">
              借资总额: {formatCurrency(totalLoan)}
            </div>
            {unsettledRecords.length > 0 && (
              <Button onClick={handleSettleAll} className="w-full mt-4 mobile-touch-target">
                <Calculator className="mr-2" size={18} />
                工资清算 ({unsettledRecords.length} 条)
              </Button>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="work" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="work">工作 ({workRecords.length})</TabsTrigger>
            <TabsTrigger value="loan">借资 ({loanRecords.length})</TabsTrigger>
            <TabsTrigger value="settlements">结算 ({salarySettlements.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="work" className="space-y-3 mt-3">
            <Button onClick={() => {
              setEditingWorkRecord(null);
              setNewWorkForm({ date: new Date().toISOString().split('T')[0], blocks: '', packages: '', spec: '' });
              setShowAddWorkModal(true);
            }} className="w-full mobile-touch-target">
              添加工作记录
            </Button>

            {unsettledRecords.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800 font-medium">未结算记录</p>
              </div>
            )}

            {unsettledRecords.map((record) => {
              const wage = calculateWage(record.blocks, record.packages, settings?.block_price || 0, settings?.package_price || 0);
              return (
                <Card key={record.id} className="cursor-pointer hover:shadow-md" onClick={() => handleEditWorkRecord(record)}>
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{formatDate(record.date)}</p>
                        <p className="text-sm text-gray-500">
                          {record.spec || '未填写规格'} | 块: {record.blocks} | 包: {record.packages}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{formatCurrency(wage)}</p>
                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                          未结算
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {settledRecords.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-2">已结算记录</p>
                {settledRecords.map((record) => {
                  const wage = calculateWage(record.blocks, record.packages, settings?.block_price || 0, settings?.package_price || 0);
                  return (
                    <Card key={record.id} className="bg-gray-50 cursor-pointer hover:shadow-md" onClick={() => handleEditWorkRecord(record)}>
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{formatDate(record.date)}</p>
                            <p className="text-sm text-gray-500">
                              {record.spec || '未填写规格'} | 块: {record.blocks} | 包: {record.packages}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-500">{formatCurrency(wage)}</p>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                              已结算
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="loan" className="space-y-3 mt-3">
            <Button onClick={() => {
              setEditingLoanRecord(null);
              setNewLoanForm({ loan_date: new Date().toISOString().split('T')[0], amount: '', reason: '' });
              setShowAddLoanModal(true);
            }} className="w-full mobile-touch-target">
              添加借资记录
            </Button>

            {loanRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-500">暂无借资记录</div>
            ) : (
              loanRecords.map((record) => (
                <Card key={record.id} className="cursor-pointer hover:shadow-md" onClick={() => handleEditLoanRecord(record)}>
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{formatDate(record.loan_date)}</p>
                        <p className="text-sm text-gray-500">{record.reason || '无理由'}</p>
                      </div>
                      <p className="font-bold text-red-500">-{formatCurrency(record.amount)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="settlements" className="space-y-3 mt-3">
            {salarySettlements.length === 0 ? (
              <div className="text-center py-8 text-gray-500">暂无结算记录</div>
            ) : (
              salarySettlements.map((settlement) => {
                const daysSinceSettlement = Math.floor(
                  (Date.now() - new Date(settlement.settlement_date).getTime()) / (1000 * 60 * 60 * 24)
                );
                const canDelete = daysSinceSettlement <= 30;

                return (
                  <Card key={settlement.id} className={!canDelete ? 'opacity-60' : ''}>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{formatDate(settlement.settlement_date)}</p>
                          <p className="text-sm text-gray-500">
                            工作记录: {settlement.work_records?.length || 0} 条
                          </p>
                          {settlement.notes && (
                            <p className="text-xs text-gray-400 mt-1">备注: {settlement.notes}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{formatCurrency(settlement.actual_payment)}</p>
                          <p className="text-xs text-gray-500">实发金额</p>
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteSettlement(settlement.id, settlement.work_records || [])}
                              className="text-red-500 text-sm mt-1"
                            >
                              删除
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        <p>应发: {formatCurrency(settlement.total_wage)} | 借资: {formatCurrency(settlement.total_loan)}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </main>

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>编辑工人</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">姓名 *</label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="mobile-touch-target" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">电话</label>
                <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="mobile-touch-target" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">年龄</label>
                <Input type="number" value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} className="mobile-touch-target" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">工种</label>
                <Input value={editForm.job_type} onChange={(e) => setEditForm({ ...editForm, job_type: e.target.value })} className="mobile-touch-target" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditing(false)} className="flex-1 mobile-touch-target">取消</Button>
                <Button onClick={handleSaveWorker} className="flex-1 mobile-touch-target">保存</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showSettlementModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>工资清算</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">选中的工作记录</p>
                <p className="font-medium">{selectedRecords.length} 条</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                <p className="text-sm text-amber-600">未结算工资（应发工资 - 借资）</p>
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalWage - totalLoan)}</p>
                <p className="text-xs text-gray-500 mt-1">应发: {formatCurrency(totalWage)} - 借资: {formatCurrency(totalLoan)}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">实际发放金额（可调整）</label>
                <Input type="number" value={settlementAmount} onChange={(e) => setSettlementAmount(e.target.value)} className="mobile-touch-target" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowSettlementModal(false)} className="flex-1 mobile-touch-target">取消</Button>
                <Button onClick={handleConfirmSettlement} className="flex-1 mobile-touch-target">确认清算</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {(showAddWorkModal || editingWorkRecord) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{editingWorkRecord ? '编辑' : '添加'}工作记录</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">日期 *</label>
                <Input type="date" value={newWorkForm.date} onChange={(e) => setNewWorkForm({ ...newWorkForm, date: e.target.value })} className="mobile-touch-target" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">块数</label>
                  <Input type="number" value={newWorkForm.blocks} onChange={(e) => setNewWorkForm({ ...newWorkForm, blocks: e.target.value })} className="mobile-touch-target" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">包数</label>
                  <Input type="number" value={newWorkForm.packages} onChange={(e) => setNewWorkForm({ ...newWorkForm, packages: e.target.value })} className="mobile-touch-target" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">规格</label>
                <Input value={newWorkForm.spec} onChange={(e) => setNewWorkForm({ ...newWorkForm, spec: e.target.value })} placeholder="选填" className="mobile-touch-target" />
              </div>
              <div className="flex gap-2 pt-2">
                {editingWorkRecord && (
                  <Button variant="destructive" onClick={() => handleDeleteWorkRecord(editingWorkRecord.id)} className="flex-1 mobile-touch-target">删除</Button>
                )}
                <Button variant="outline" onClick={() => { setEditingWorkRecord(null); setShowAddWorkModal(false); }} className="flex-1 mobile-touch-target">取消</Button>
                <Button onClick={handleSaveWorkRecord} className="flex-1 mobile-touch-target">保存</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {(showAddLoanModal || editingLoanRecord) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{editingLoanRecord ? '编辑' : '添加'}借资记录</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">借资日期 *</label>
                <Input type="date" value={newLoanForm.loan_date} onChange={(e) => setNewLoanForm({ ...newLoanForm, loan_date: e.target.value })} className="mobile-touch-target" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">借资金额（元） *</label>
                <Input type="number" step="0.01" value={newLoanForm.amount} onChange={(e) => setNewLoanForm({ ...newLoanForm, amount: e.target.value })} className="mobile-touch-target" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">借资理由</label>
                <Input value={newLoanForm.reason} onChange={(e) => setNewLoanForm({ ...newLoanForm, reason: e.target.value })} placeholder="选填" className="mobile-touch-target" />
              </div>
              <div className="flex gap-2 pt-2">
                {editingLoanRecord && (
                  <Button variant="destructive" onClick={() => handleDeleteLoanRecord(editingLoanRecord.id)} className="flex-1 mobile-touch-target">删除</Button>
                )}
                <Button variant="outline" onClick={() => { setEditingLoanRecord(null); setShowAddLoanModal(false); }} className="flex-1 mobile-touch-target">取消</Button>
                <Button onClick={handleSaveLoanRecord} className="flex-1 mobile-touch-target">保存</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}