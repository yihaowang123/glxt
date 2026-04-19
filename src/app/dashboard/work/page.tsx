'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWorkRecords, useLoanRecords, useWorkers } from '@/hooks/useWorkers';
import { useWageSettings } from '@/hooks/useWageSettings';
import { createClient } from '@/lib/supabase';
import { formatCurrency, formatDate, calculateWage } from '@/lib/utils';
import { Plus, Search, Settings } from 'lucide-react';
import type { WorkRecord, LoanRecord } from '@/types';

export default function WorkPage() {
  const supabase = createClient();
  const { settings, updateSettings, refetch: refetchSettings } = useWageSettings();
  const { workers, fetchWorkers } = useWorkers();

  const [recordsSearchTerm, setRecordsSearchTerm] = useState('');
  const [loansSearchTerm, setLoansSearchTerm] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [showAddLoanModal, setShowAddLoanModal] = useState(false);
  const [editingWorkRecord, setEditingWorkRecord] = useState<WorkRecord | null>(null);
  const [editingLoanRecord, setEditingLoanRecord] = useState<LoanRecord | null>(null);

  const [blockPrice, setBlockPrice] = useState('');
  const [packagePrice, setPackagePrice] = useState('');

  const [newRecord, setNewRecord] = useState({
    worker_id: '',
    date: new Date().toISOString().split('T')[0],
    blocks: '',
    packages: '',
    spec: '',
  });

  const [newLoan, setNewLoan] = useState({
    worker_id: '',
    amount: '',
    reason: '',
    loan_date: new Date().toISOString().split('T')[0],
  });

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const workFilters = {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };

  const loanFilters = {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };

  const { records: workRecords, fetchRecords: fetchWorkRecords } = useWorkRecords(workFilters);
  const { records: loanRecords, fetchRecords: fetchLoanRecords } = useLoanRecords(loanFilters);

  useEffect(() => {
    if (settings) {
      setBlockPrice(settings.block_price.toString());
      setPackagePrice(settings.package_price.toString());
    }
  }, [settings]);

  const handleSaveSettings = async () => {
    try {
      await updateSettings(parseFloat(blockPrice), parseFloat(packagePrice));
      setShowSettingsModal(false);
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  const handleAddWorkRecord = async () => {
    if (!newRecord.worker_id || !newRecord.date) return;
    try {
      const { error } = await supabase
        .from('work_records')
        .insert([{
          worker_id: newRecord.worker_id,
          date: newRecord.date,
          blocks: parseInt(newRecord.blocks) || 0,
          packages: parseInt(newRecord.packages) || 0,
          spec: newRecord.spec || null,
          is_settled: false,
        }]);

      if (error) throw error;
      setShowAddRecordModal(false);
      setNewRecord({ worker_id: '', date: new Date().toISOString().split('T')[0], blocks: '', packages: '', spec: '' });
      fetchWorkRecords();
      fetchWorkers();
    } catch (error) {
      console.error('Failed to add work record:', error);
    }
  };

  const handleSaveWorkRecord = async () => {
    if (!editingWorkRecord) return;
    try {
      const { error } = await supabase
        .from('work_records')
        .update({
          worker_id: newRecord.worker_id,
          date: newRecord.date,
          blocks: parseInt(newRecord.blocks) || 0,
          packages: parseInt(newRecord.packages) || 0,
          spec: newRecord.spec || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingWorkRecord.id);

      if (error) throw error;
      setEditingWorkRecord(null);
      setShowAddRecordModal(false);
      setNewRecord({ worker_id: '', date: new Date().toISOString().split('T')[0], blocks: '', packages: '', spec: '' });
      fetchWorkRecords();
      fetchWorkers();
    } catch (error) {
      console.error('Failed to save work record:', error);
    }
  };

  const handleDeleteWorkRecord = async (id: string) => {
    if (!confirm('确定要删除这条工作记录吗？')) return;
    try {
      const { error } = await supabase.from('work_records').delete().eq('id', id);
      if (error) throw error;
      setEditingWorkRecord(null);
      setShowAddRecordModal(false);
      fetchWorkRecords();
      fetchWorkers();
    } catch (error) {
      console.error('Failed to delete work record:', error);
    }
  };

  const handleAddLoanRecord = async () => {
    if (!newLoan.worker_id || !newLoan.amount || !newLoan.loan_date) return;
    try {
      const { error } = await supabase
        .from('loan_records')
        .insert([{
          worker_id: newLoan.worker_id,
          amount: parseFloat(newLoan.amount),
          reason: newLoan.reason || null,
          loan_date: newLoan.loan_date,
        }]);

      if (error) throw error;
      setShowAddLoanModal(false);
      setNewLoan({ worker_id: '', amount: '', reason: '', loan_date: new Date().toISOString().split('T')[0] });
      fetchLoanRecords();
      fetchWorkers();
    } catch (error) {
      console.error('Failed to add loan record:', error);
    }
  };

  const handleSaveLoanRecord = async () => {
    if (!editingLoanRecord) return;
    try {
      const { error } = await supabase
        .from('loan_records')
        .update({
          worker_id: newLoan.worker_id,
          amount: parseFloat(newLoan.amount),
          reason: newLoan.reason || null,
          loan_date: newLoan.loan_date,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingLoanRecord.id);

      if (error) throw error;
      setEditingLoanRecord(null);
      setShowAddLoanModal(false);
      setNewLoan({ worker_id: '', amount: '', reason: '', loan_date: new Date().toISOString().split('T')[0] });
      fetchLoanRecords();
      fetchWorkers();
    } catch (error) {
      console.error('Failed to save loan record:', error);
    }
  };

  const handleDeleteLoanRecord = async (id: string) => {
    if (!confirm('确定要删除这条借资记录吗？')) return;
    try {
      const { error } = await supabase.from('loan_records').delete().eq('id', id);
      if (error) throw error;
      setEditingLoanRecord(null);
      setShowAddLoanModal(false);
      fetchLoanRecords();
      fetchWorkers();
    } catch (error) {
      console.error('Failed to delete loan record:', error);
    }
  };

  const openEditWorkRecord = (record: WorkRecord) => {
    setEditingWorkRecord(record);
    setNewRecord({
      worker_id: record.worker_id,
      date: record.date,
      blocks: record.blocks.toString(),
      packages: record.packages.toString(),
      spec: record.spec || '',
    });
    setShowAddRecordModal(true);
  };

  const openEditLoanRecord = (record: LoanRecord) => {
    setEditingLoanRecord(record);
    setNewLoan({
      worker_id: record.worker_id,
      amount: record.amount.toString(),
      reason: record.reason || '',
      loan_date: record.loan_date,
    });
    setShowAddLoanModal(true);
  };

  const openAddWorkRecord = () => {
    setEditingWorkRecord(null);
    setNewRecord({
      worker_id: '',
      date: new Date().toISOString().split('T')[0],
      blocks: '',
      packages: '',
      spec: '',
    });
    setShowAddRecordModal(true);
  };

  const openAddLoanRecord = () => {
    setEditingLoanRecord(null);
    setNewLoan({
      worker_id: '',
      amount: '',
      reason: '',
      loan_date: new Date().toISOString().split('T')[0],
    });
    setShowAddLoanModal(true);
  };

  const filteredWorkRecords = workRecords.filter(record =>
    record.worker_name?.toLowerCase().includes(recordsSearchTerm.toLowerCase())
  );

  const filteredLoanRecords = loanRecords.filter(record =>
    record.worker_name?.toLowerCase().includes(loansSearchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center gap-3">
          <h1 className="text-lg font-bold flex-1">工作情况</h1>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="mobile-touch-target"
            title="工资单价设置"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="p-4 space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="开始日期"
              className="mobile-touch-target"
            />
          </div>
          <span className="self-center text-gray-500">至</span>
          <div className="flex-1">
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="结束日期"
              className="mobile-touch-target"
            />
          </div>
        </div>

        <Tabs defaultValue="records" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="records">工作记录</TabsTrigger>
            <TabsTrigger value="loans">借资记录</TabsTrigger>
          </TabsList>

          <TabsContent value="records" className="space-y-3 mt-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  placeholder="搜索工人姓名..."
                  value={recordsSearchTerm}
                  onChange={(e) => setRecordsSearchTerm(e.target.value)}
                  className="pl-10 mobile-touch-target"
                />
              </div>
              <Button onClick={openAddWorkRecord} size="icon" className="mobile-touch-target">
                <Plus size={20} />
              </Button>
            </div>

            {filteredWorkRecords.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>暂无工作记录</p>
              </div>
            ) : (
              filteredWorkRecords.map((record) => {
                const wage = calculateWage(
                  record.blocks,
                  record.packages,
                  settings?.block_price || 0,
                  settings?.package_price || 0
                );

                return (
                  <Card key={record.id} className="cursor-pointer hover:shadow-md" onClick={() => openEditWorkRecord(record)}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-lg">{record.worker_name}</p>
                          <p className="text-sm text-gray-500">{formatDate(record.date)}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {record.spec || '未填写规格'} | 块: {record.blocks} | 包: {record.packages}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-primary">{formatCurrency(wage)}</p>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            record.is_settled
                              ? 'bg-green-100 text-green-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {record.is_settled ? '已结算' : '未结算'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="loans" className="space-y-3 mt-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  placeholder="搜索工人姓名..."
                  value={loansSearchTerm}
                  onChange={(e) => setLoansSearchTerm(e.target.value)}
                  className="pl-10 mobile-touch-target"
                />
              </div>
              <Button onClick={openAddLoanRecord} size="icon" className="mobile-touch-target">
                <Plus size={20} />
              </Button>
            </div>

            {filteredLoanRecords.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>暂无借资记录</p>
              </div>
            ) : (
              filteredLoanRecords.map((record) => (
                <Card key={record.id} className="cursor-pointer hover:shadow-md" onClick={() => openEditLoanRecord(record)}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-lg">{record.worker_name}</p>
                        <p className="text-sm text-gray-500">{formatDate(record.loan_date)}</p>
                        <p className="text-sm text-gray-600 mt-1">{record.reason || '无理由'}</p>
                      </div>
                      <p className="text-xl font-bold text-red-500">-{formatCurrency(record.amount)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>工资单价设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">块单价（元/块）</label>
                <Input
                  type="number"
                  step="0.01"
                  value={blockPrice}
                  onChange={(e) => setBlockPrice(e.target.value)}
                  className="mobile-touch-target"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">包单价（元/包）</label>
                <Input
                  type="number"
                  step="0.01"
                  value={packagePrice}
                  onChange={(e) => setPackagePrice(e.target.value)}
                  className="mobile-touch-target"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowSettingsModal(false)} className="flex-1 mobile-touch-target">
                  取消
                </Button>
                <Button onClick={handleSaveSettings} className="flex-1 mobile-touch-target">
                  保存
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showAddRecordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{editingWorkRecord ? '编辑' : '添加'}工作记录</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">工人 *</label>
                <select
                  value={newRecord.worker_id}
                  onChange={(e) => setNewRecord({ ...newRecord, worker_id: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">请选择工人</option>
                  {workers.map((worker) => (
                    <option key={worker.id} value={worker.id}>{worker.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">日期 *</label>
                <Input
                  type="date"
                  value={newRecord.date}
                  onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })}
                  className="mobile-touch-target"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">块数</label>
                  <Input
                    type="number"
                    value={newRecord.blocks}
                    onChange={(e) => setNewRecord({ ...newRecord, blocks: e.target.value })}
                    placeholder="0"
                    className="mobile-touch-target"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">包数</label>
                  <Input
                    type="number"
                    value={newRecord.packages}
                    onChange={(e) => setNewRecord({ ...newRecord, packages: e.target.value })}
                    placeholder="0"
                    className="mobile-touch-target"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">规格</label>
                <Input
                  value={newRecord.spec}
                  onChange={(e) => setNewRecord({ ...newRecord, spec: e.target.value })}
                  placeholder="如：标准砖、多孔砖等"
                  className="mobile-touch-target"
                />
              </div>
              <div className="flex gap-2 pt-2">
                {editingWorkRecord && (
                  <Button variant="destructive" onClick={() => handleDeleteWorkRecord(editingWorkRecord.id)} className="flex-1 mobile-touch-target">
                    删除
                  </Button>
                )}
                <Button variant="outline" onClick={() => { setEditingWorkRecord(null); setShowAddRecordModal(false); }} className="flex-1 mobile-touch-target">
                  取消
                </Button>
                <Button onClick={editingWorkRecord ? handleSaveWorkRecord : handleAddWorkRecord} className="flex-1 mobile-touch-target">
                  保存
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showAddLoanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{editingLoanRecord ? '编辑' : '添加'}借资记录</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">工人 *</label>
                <select
                  value={newLoan.worker_id}
                  onChange={(e) => setNewLoan({ ...newLoan, worker_id: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">请选择工人</option>
                  {workers.map((worker) => (
                    <option key={worker.id} value={worker.id}>{worker.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">借资金额（元） *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={newLoan.amount}
                  onChange={(e) => setNewLoan({ ...newLoan, amount: e.target.value })}
                  placeholder="请输入金额"
                  className="mobile-touch-target"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">借资日期 *</label>
                <Input
                  type="date"
                  value={newLoan.loan_date}
                  onChange={(e) => setNewLoan({ ...newLoan, loan_date: e.target.value })}
                  className="mobile-touch-target"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">借资理由</label>
                <Input
                  value={newLoan.reason}
                  onChange={(e) => setNewLoan({ ...newLoan, reason: e.target.value })}
                  placeholder="选填"
                  className="mobile-touch-target"
                />
              </div>
              <div className="flex gap-2 pt-2">
                {editingLoanRecord && (
                  <Button variant="destructive" onClick={() => handleDeleteLoanRecord(editingLoanRecord.id)} className="flex-1 mobile-touch-target">
                    删除
                  </Button>
                )}
                <Button variant="outline" onClick={() => { setEditingLoanRecord(null); setShowAddLoanModal(false); }} className="flex-1 mobile-touch-target">
                  取消
                </Button>
                <Button onClick={editingLoanRecord ? handleSaveLoanRecord : handleAddLoanRecord} className="flex-1 mobile-touch-target">
                  保存
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}