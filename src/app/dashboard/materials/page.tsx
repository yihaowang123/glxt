'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Package } from 'lucide-react';
import PhotoUpload from '@/components/ui/photo-upload';
import { ClickableImage } from '@/components/ui/image-preview';
import { WorkerNameInput } from '@/components/ui/worker-name-input';
import { SearchNameInput } from '@/components/ui/search-name-input';
import type { MaterialRecord, MaterialType } from '@/types';

const materialTypes: { value: MaterialType; label: string }[] = [
  { value: 'cement', label: '水泥' },
  { value: 'sand', label: '砂石料' },
  { value: 'freight', label: '运费明细' },
  { value: 'external_brick', label: '外调砖' },
  { value: 'internal_brick', label: '内调砖' },
  { value: 'site_supply', label: '工地供货明细' },
];

const typesWithPhoto = ['cement', 'sand', 'external_brick', 'internal_brick', 'site_supply'];

export default function MaterialsPage() {
  const supabase = createClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<MaterialType>('cement');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaterialRecord | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [records, setRecords] = useState<MaterialRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchClicked, setSearchClicked] = useState(false);

  const [formData, setFormData] = useState<Partial<MaterialRecord>>({
    name: '',
    date: new Date().toISOString().split('T')[0],
    worker_name: '',
    photo_url: '',
  });

  useEffect(() => {
    if (searchClicked) {
      fetchRecords();
    }
  }, [selectedType, startDate, endDate, searchClicked]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('material_records')
        .select('*')
        .eq('type', selectedType)
        .order('date', { ascending: false });

      if (searchTerm) {
        if (selectedType === 'freight') {
          query = query.or(`name.ilike.%${searchTerm}%,worker_name.ilike.%${searchTerm}%,delivery_location.ilike.%${searchTerm}%`);
        } else {
          query = query.or(`name.ilike.%${searchTerm}%,worker_name.ilike.%${searchTerm}%`);
        }
      }
      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Failed to fetch records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setSearchClicked(true);
    fetchRecords();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      date: new Date().toISOString().split('T')[0],
      worker_name: '',
      photo_url: '',
    });
  };

  const handleAdd = () => {
    resetForm();
    setEditingRecord(null);
    setShowAddModal(true);
  };

  const handleEdit = (record: MaterialRecord) => {
    setEditingRecord(record);
    setFormData(record);
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.date) return;

    try {
      if (editingRecord) {
        const { error } = await supabase
          .from('material_records')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', editingRecord.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('material_records')
          .insert([{ ...formData, type: selectedType }]);
        if (error) throw error;
      }
      setShowAddModal(false);
      resetForm();
      fetchRecords();
    } catch (error) {
      console.error('Failed to save record:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条记录吗？')) return;
    try {
      const { error } = await supabase.from('material_records').delete().eq('id', id);
      if (error) throw error;
      fetchRecords();
    } catch (error) {
      console.error('Failed to delete record:', error);
    }
  };

  const calculateAmount = () => {
    if (selectedType === 'cement' || selectedType === 'sand') {
      return (formData.quantity_tons || 0) * (formData.unit_price || 0);
    } else if (selectedType === 'freight') {
      return (formData.quantity_blocks || 0) * (formData.unit_price_1 || 0) +
             (formData.packages || 0) * (formData.unit_price_2 || 0);
    } else if (selectedType === 'external_brick' || selectedType === 'internal_brick') {
      return (formData.quantity_blocks || 0) * (formData.unit_price || 0);
    } else if (selectedType === 'site_supply') {
      return (formData.quantity || 0) * (formData.unit_price || 0);
    }
    return 0;
  };

  const handleAutoFill = (data: Partial<MaterialRecord>) => {
    setFormData(prev => ({
      ...prev,
      ...data,
    }));
  };

  const renderFormFields = () => {
    const needsPhoto = typesWithPhoto.includes(selectedType);

    return (
      <>
        {needsPhoto && (
          <PhotoUpload
            value={formData.photo_url}
            onChange={(url) => setFormData({ ...formData, photo_url: url })}
          />
        )}

        {selectedType !== 'site_supply' && (
          <WorkerNameInput
            value={formData.worker_name || ''}
            onChange={(val) => setFormData({ ...formData, worker_name: val })}
            onAutoFill={handleAutoFill}
            materialType={selectedType}
          />
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">名称 *</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="请输入物料名称"
            className="mobile-touch-target"
          />
        </div>

        {selectedType === 'cement' || selectedType === 'sand' ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">数量（吨）</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.quantity_tons || ''}
                  onChange={(e) => setFormData({ ...formData, quantity_tons: parseFloat(e.target.value) || 0 })}
                  className="mobile-touch-target"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">单价（元/吨）</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.unit_price || ''}
                  onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                  className="mobile-touch-target"
                />
              </div>
            </div>
          </>
        ) : selectedType === 'freight' ? (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">规格</label>
              <Input
                value={formData.spec || ''}
                onChange={(e) => setFormData({ ...formData, spec: e.target.value })}
                className="mobile-touch-target"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">送货地点</label>
              <Input
                value={formData.delivery_location || ''}
                onChange={(e) => setFormData({ ...formData, delivery_location: e.target.value })}
                placeholder="请输入或选择送货地点"
                className="mobile-touch-target"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">数量（块）</label>
                <Input
                  type="number"
                  value={formData.quantity_blocks || ''}
                  onChange={(e) => setFormData({ ...formData, quantity_blocks: parseInt(e.target.value) || 0 })}
                  className="mobile-touch-target"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">包数</label>
                <Input
                  type="number"
                  value={formData.packages || ''}
                  onChange={(e) => setFormData({ ...formData, packages: parseInt(e.target.value) || 0 })}
                  className="mobile-touch-target"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">单价1（元/块）</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.unit_price_1 || ''}
                  onChange={(e) => setFormData({ ...formData, unit_price_1: parseFloat(e.target.value) || 0 })}
                  className="mobile-touch-target"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">单价2（元/包）</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.unit_price_2 || ''}
                  onChange={(e) => setFormData({ ...formData, unit_price_2: parseFloat(e.target.value) || 0 })}
                  className="mobile-touch-target"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">车号</label>
                <Input
                  value={formData.vehicle_number || ''}
                  onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                  className="mobile-touch-target"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">票号</label>
                <Input
                  value={formData.ticket_number || ''}
                  onChange={(e) => setFormData({ ...formData, ticket_number: e.target.value })}
                  className="mobile-touch-target"
                />
              </div>
            </div>
          </>
        ) : selectedType === 'external_brick' || selectedType === 'internal_brick' ? (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">规格</label>
              <Input
                value={formData.spec || ''}
                onChange={(e) => setFormData({ ...formData, spec: e.target.value })}
                className="mobile-touch-target"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">数量（块）</label>
                <Input
                  type="number"
                  value={formData.quantity_blocks || ''}
                  onChange={(e) => setFormData({ ...formData, quantity_blocks: parseInt(e.target.value) || 0 })}
                  className="mobile-touch-target"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">包数</label>
                <Input
                  type="number"
                  value={formData.packages || ''}
                  onChange={(e) => setFormData({ ...formData, packages: parseInt(e.target.value) || 0 })}
                  className="mobile-touch-target"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">颜色</label>
                <Input
                  value={formData.color || ''}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="mobile-touch-target"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">单价（元）</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.unit_price || ''}
                  onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                  className="mobile-touch-target"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">司机</label>
                <Input
                  value={formData.driver || ''}
                  onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
                  className="mobile-touch-target"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">车号</label>
                <Input
                  value={formData.vehicle_number || ''}
                  onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                  className="mobile-touch-target"
                />
              </div>
            </div>
          </>
        ) : selectedType === 'site_supply' ? (
          <>
            <WorkerNameInput
              value={formData.worker_name || ''}
              onChange={(val) => setFormData({ ...formData, worker_name: val })}
              onAutoFill={handleAutoFill}
              materialType={selectedType}
            />
            <div className="space-y-2">
              <label className="text-sm font-medium">规格</label>
              <Input
                value={formData.spec || ''}
                onChange={(e) => setFormData({ ...formData, spec: e.target.value })}
                className="mobile-touch-target"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">颜色</label>
              <Input
                value={formData.color || ''}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="mobile-touch-target"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">数量</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.quantity || ''}
                  onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                  className="mobile-touch-target"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">单位</label>
                <select
                  value={formData.quantity_unit || ''}
                  onChange={(e) => setFormData({ ...formData, quantity_unit: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">请选择</option>
                  <option value="块">块</option>
                  <option value="包">包</option>
                  <option value="方">方</option>
                  <option value="吨">吨</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">单价（元）</label>
              <Input
                type="number"
                step="0.01"
                value={formData.unit_price || ''}
                onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                className="mobile-touch-target"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">票号</label>
              <Input
                value={formData.ticket_number || ''}
                onChange={(e) => setFormData({ ...formData, ticket_number: e.target.value })}
                className="mobile-touch-target"
              />
            </div>
          </>
        ) : null}

        <div className="space-y-2">
          <label className="text-sm font-medium">金额（元）</label>
          <p className="text-2xl font-bold text-primary">{formatCurrency(calculateAmount())}</p>
        </div>
      </>
    );
  };

  const renderRecordCard = (record: MaterialRecord) => {
    let amount = 0;
    let details = '';

    if (selectedType === 'cement' || selectedType === 'sand') {
      amount = (record.quantity_tons || 0) * (record.unit_price || 0);
      details = `${record.quantity_tons}吨 @ ${formatCurrency(record.unit_price || 0)}/吨`;
    } else if (selectedType === 'freight') {
      amount = (record.quantity_blocks || 0) * (record.unit_price_1 || 0) +
               (record.packages || 0) * (record.unit_price_2 || 0);
      details = `块: ${record.quantity_blocks}, 包: ${record.packages}`;
    } else if (selectedType === 'external_brick' || selectedType === 'internal_brick') {
      amount = (record.quantity_blocks || 0) * (record.unit_price || 0);
      details = `块: ${record.quantity_blocks}, 包: ${record.packages}`;
    } else if (selectedType === 'site_supply') {
      amount = (record.quantity || 0) * (record.unit_price || 0);
      details = `${record.quantity} ${record.quantity_unit}`;
    }

    return (
      <Card key={record.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleEdit(record)}>
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {selectedType === 'freight' ? (
                <>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">姓名：</span>
                      <span className="font-medium">{record.worker_name || '未填写'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">名称：</span>
                      <span className="font-medium">{record.name || '未填写'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">规格：</span>
                      <span className="font-medium">{record.spec || '未填写'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">送货地点：</span>
                      <span className="font-medium">{record.delivery_location || '未填写'}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{details}</p>
                  <p className="text-sm text-gray-500 mt-1">{formatDate(record.date)}</p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-lg">{record.name}</p>
                  <p className="text-sm text-gray-500">{record.worker_name || '未填写'}</p>
                  <p className="text-sm text-gray-600 mt-1">{details}</p>
                  <p className="text-sm text-gray-500 mt-1">{formatDate(record.date)}</p>
                  {record.photo_url && (
                    <ClickableImage src={record.photo_url} alt="Photo" className="w-16 h-16 object-cover rounded mt-2" />
                  )}
                </>
              )}
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-primary">{formatCurrency(amount)}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(record.id);
                }}
                className="text-red-500 text-sm mt-2"
              >
                删除
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold">物料管理</h1>
        </div>
      </header>

      <main className="p-4 space-y-4">
        <div className="relative">
          <SearchNameInput
            value={searchTerm}
            onChange={setSearchTerm}
            materialType={selectedType}
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
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

        <div className="flex gap-2">
          <Button onClick={handleSearch} className="flex-1 mobile-touch-target">
            搜索
          </Button>
          <Button onClick={handleAdd} size="icon" className="mobile-touch-target">
            <Plus size={20} />
          </Button>
        </div>

        <Tabs value={selectedType} onValueChange={(v) => {
          setSelectedType(v as MaterialType);
          setSearchClicked(false);
          setRecords([]);
        }} className="w-full">
          <TabsList className="w-full flex overflow-x-auto whitespace-nowrap">
            {materialTypes.map((type) => (
              <TabsTrigger key={type.value} value={type.value} className="flex-shrink-0">
                {type.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="text-center py-12 text-gray-500">加载中...</div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Package size={48} className="mb-4 opacity-50" />
            <p>暂无{materialTypes.find(t => t.value === selectedType)?.label}记录</p>
            {searchClicked && <p className="text-sm mt-2">请调整搜索条件重试</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {records.map(renderRecordCard)}
          </div>
        )}
      </main>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editingRecord ? '编辑' : '添加'}{materialTypes.find(t => t.value === selectedType)?.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">日期 *</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="mobile-touch-target"
                />
              </div>
              {renderFormFields()}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1 mobile-touch-target">
                  取消
                </Button>
                <Button onClick={handleSave} className="flex-1 mobile-touch-target">
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