'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase';
import { exportWorkersToExcel, exportLoanRecordsToExcel, exportWorkRecordsToExcel, exportMaterialRecordsToExcel } from '@/lib/excel';
import { User, Lock, LogOut, Trash2, AlertTriangle, Download } from 'lucide-react';

const formatModules = [
  { value: 'workers', label: '工人管理', table: 'workers' },
  { value: 'work_records', label: '工作记录', table: 'work_records' },
  { value: 'loan_records', label: '借资记录', table: 'loan_records' },
  { value: 'material_records', label: '物料记录', table: 'material_records' },
  { value: 'salary_settlements', label: '工资结算记录', table: 'salary_settlements' },
];

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const [showFormatModal, setShowFormatModal] = useState(false);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [confirmText, setConfirmText] = useState('');
  const [formatting, setFormatting] = useState(false);
  const [formatSuccess, setFormatSuccess] = useState('');

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userData));
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (oldPassword !== user.password) {
      setPasswordError('原密码错误');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('新密码长度至少为6位');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的新密码不一致');
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ password: newPassword, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;

      const updatedUser = { ...user, password: newPassword };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      setPasswordSuccess('密码修改成功！');
      setShowPasswordModal(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Failed to update password:', error);
      setPasswordError('修改失败，请稍后重试');
    }
  };

  const toggleModule = (moduleValue: string) => {
    setSelectedModules(prev =>
      prev.includes(moduleValue)
        ? prev.filter(m => m !== moduleValue)
        : [...prev, moduleValue]
    );
  };

  const handleBackupAndFormat = async () => {
    if (selectedModules.length === 0) {
      alert('请选择要格式化的模块');
      return;
    }

    if (confirmText !== '确认') {
      alert('请输入"确认"来确认格式化操作');
      return;
    }

    if (!confirm(`即将格式化以下模块的数据：${selectedModules.join(', ')}，此操作不可恢复！`)) {
      return;
    }

    setFormatting(true);

    try {
      for (const moduleValue of selectedModules) {
        const module = formatModules.find(m => m.value === moduleValue);
        if (!module) continue;

        if (moduleValue === 'workers') {
          const { data: workers } = await supabase.from('workers').select('*');
          if (workers && workers.length > 0) {
            const workRecordsMap = new Map();
            const loanRecordsMap = new Map();
            const settlementsMap = new Map();

            for (const worker of workers) {
              const { data: workRecords } = await supabase.from('work_records').select('*').eq('worker_id', worker.id);
              workRecordsMap.set(worker.id, workRecords || []);

              const { data: loanRecords } = await supabase.from('loan_records').select('*').eq('worker_id', worker.id);
              loanRecordsMap.set(worker.id, loanRecords || []);

              const { data: settlements } = await supabase.from('salary_settlements').select('*').eq('worker_id', worker.id);
              settlementsMap.set(worker.id, settlements || []);
            }

            await exportWorkersToExcel(workers, workRecordsMap, loanRecordsMap, settlementsMap);
          }
        } else if (moduleValue === 'work_records') {
          const { data: records } = await supabase.from('work_records').select('*, workers(name)');
          if (records && records.length > 0) {
            const recordsWithName = records.map(r => ({ ...r, worker_name: r.workers?.name }));
            await exportWorkRecordsToExcel(recordsWithName, false);
            await exportWorkRecordsToExcel(recordsWithName.filter(r => r.is_settled), true);
          }
        } else if (moduleValue === 'loan_records') {
          const { data: records } = await supabase.from('loan_records').select('*, workers(name)');
          if (records && records.length > 0) {
            const recordsWithName = records.map(r => ({ ...r, worker_name: r.workers?.name }));
            await exportLoanRecordsToExcel(recordsWithName);
          }
        } else if (moduleValue === 'material_records') {
          const types = ['cement', 'sand', 'freight', 'external_brick', 'internal_brick', 'site_supply'];
          for (const type of types) {
            const { data: records } = await supabase.from('material_records').select('*').eq('type', type);
            if (records && records.length > 0) {
              await exportMaterialRecordsToExcel(records, type);
            }
          }
        } else if (moduleValue === 'salary_settlements') {
          const { data: records } = await supabase.from('salary_settlements').select('*, workers(name)');
          if (records && records.length > 0) {
            const recordsWithName = records.map(r => ({ ...r, worker_name: r.workers?.name }));
            await exportLoanRecordsToExcel(recordsWithName);
          }
        }
      }

      alert('备份导出成功！即将开始格式化数据...');

      for (const moduleValue of selectedModules) {
        const module = formatModules.find(m => m.value === moduleValue);
        if (!module) continue;

        if (moduleValue === 'salary_settlements') {
          const { error } = await supabase.from(module.table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
          if (error) console.error(`Failed to delete ${moduleValue}:`, error);

          const { data: allWorkRecords } = await supabase.from('work_records').select('id').eq('is_settled', true);
          if (allWorkRecords && allWorkRecords.length > 0) {
            for (const record of allWorkRecords) {
              await supabase.from('work_records').update({ is_settled: false, settled_at: null }).eq('id', record.id);
            }
          }
        } else {
          const { error } = await supabase.from(module.table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
          if (error) console.error(`Failed to delete ${moduleValue}:`, error);
        }
      }

      setFormatSuccess(`成功格式化 ${selectedModules.length} 个模块的数据！`);
      setSelectedModules([]);
      setConfirmText('');
      setTimeout(() => {
        setShowFormatModal(false);
        setFormatSuccess('');
      }, 2000);
    } catch (error) {
      console.error('Format error:', error);
      alert('格式化失败，请稍后重试');
    } finally {
      setFormatting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold">个人中心</h1>
        </div>
      </header>

      <main className="p-4 space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <User size={32} className="text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{user?.username}</h2>
                <p className="text-sm text-gray-500">账号信息</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">账号设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-lg flex items-center gap-3 mobile-touch-target transition-colors"
            >
              <Lock size={20} className="text-gray-500" />
              <span className="flex-1 text-left">修改密码</span>
              <span className="text-gray-400">›</span>
            </button>

            <button
              onClick={() => setShowFormatModal(true)}
              className="w-full p-4 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-3 mobile-touch-target transition-colors"
            >
              <Trash2 size={20} className="text-red-500" />
              <span className="flex-1 text-left text-red-600">数据格式化</span>
              <span className="text-gray-400">›</span>
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <button
              onClick={handleLogout}
              className="w-full p-4 bg-red-50 hover:bg-red-100 rounded-lg flex items-center justify-center gap-2 mobile-touch-target transition-colors text-red-600"
            >
              <LogOut size={20} />
              <span className="font-medium">退出登录</span>
            </button>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500 mt-8">
          <p>工地管理系统</p>
          <p className="mt-1">版本 1.0.0</p>
        </div>
      </main>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>修改密码</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">原密码</label>
                <Input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="请输入原密码"
                  className="mobile-touch-target"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">新密码</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="请输入新密码（至少6位）"
                  className="mobile-touch-target"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">确认新密码</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入新密码"
                  className="mobile-touch-target"
                />
              </div>

              {passwordError && (
                <p className="text-sm text-red-500 text-center">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-sm text-green-500 text-center">{passwordSuccess}</p>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordError('');
                    setOldPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="flex-1 mobile-touch-target"
                >
                  取消
                </Button>
                <Button
                  onClick={handleChangePassword}
                  className="flex-1 mobile-touch-target"
                >
                  确认修改
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showFormatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="text-red-500" size={20} />
                数据格式化
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600 font-medium">⚠️ 危险操作警告</p>
                <p className="text-xs text-red-500 mt-1">
                  格式化操作将永久删除数据，且不可恢复！请先导出备份。
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">选择要格式化的模块：</label>
                {formatModules.map((module) => (
                  <label key={module.value} className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={selectedModules.includes(module.value)}
                      onChange={() => toggleModule(module.value)}
                      className="w-5 h-5"
                    />
                    <span>{module.label}</span>
                  </label>
                ))}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-700">
                  📋 格式化前会自动导出备份Excel
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  保留数据：管理员账号、工资单价设置
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">确认操作：</label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="请输入'确认'"
                  className="mobile-touch-target"
                />
              </div>

              {formatSuccess && (
                <p className="text-sm text-green-500 text-center">{formatSuccess}</p>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowFormatModal(false);
                    setSelectedModules([]);
                    setConfirmText('');
                    setFormatSuccess('');
                  }}
                  className="flex-1 mobile-touch-target"
                  disabled={formatting}
                >
                  取消
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleBackupAndFormat}
                  className="flex-1 mobile-touch-target"
                  disabled={formatting || selectedModules.length === 0 || confirmText !== '确认'}
                >
                  {formatting ? '处理中...' : '确认格式化'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}