import ExcelJS from 'exceljs';
import type { Worker, WorkRecord, LoanRecord, SalarySettlement, MaterialRecord } from '@/types';

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function exportWorkersToExcel(
  workers: Worker[],
  workRecords: Map<string, WorkRecord[]>,
  loanRecords: Map<string, LoanRecord[]>,
  settlements: Map<string, SalarySettlement[]>,
  dateRange?: { start: string; end: string }
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GLXT';
  workbook.created = new Date();

  for (const worker of workers) {
    const sheet = workbook.addWorksheet(worker.name);

    sheet.addRow(['姓名', worker.name]);
    sheet.addRow(['电话', worker.phone || '']);
    sheet.addRow(['年龄', worker.age || '']);
    sheet.addRow(['工种', worker.job_type || '']);
    sheet.addRow([]);

    const workerLoanRecords = loanRecords.get(worker.id) || [];
    if (workerLoanRecords.length > 0) {
      sheet.addRow(['借资记录']);
      sheet.addRow(['日期', '金额', '理由']);
      workerLoanRecords.forEach((record) => {
        sheet.addRow([record.loan_date, record.amount, record.reason || '']);
      });
      sheet.addRow([]);
    }

    const workerSettlements = settlements.get(worker.id) || [];
    if (workerSettlements.length > 0) {
      sheet.addRow(['工资结算记录']);
      sheet.addRow(['结算日期', '应发工资', '借资总额', '实际发放', '备注']);
      workerSettlements.forEach((settlement) => {
        sheet.addRow([
          settlement.settlement_date,
          settlement.total_wage,
          settlement.total_loan,
          settlement.actual_payment,
          settlement.notes || ''
        ]);
      });
      sheet.addRow([]);
    }

    const unsettledRecords = (workRecords.get(worker.id) || []).filter(r => !r.is_settled);
    if (unsettledRecords.length > 0) {
      sheet.addRow(['未结算工作记录']);
      sheet.addRow(['日期', '规格', '块数', '板数', '工资']);
      unsettledRecords.forEach((record) => {
        sheet.addRow([record.date, record.spec || '', record.blocks, record.packages, record.wage || 0]);
      });
      sheet.addRow([]);
    }

    const settledRecords = (workRecords.get(worker.id) || []).filter(r => r.is_settled);
    if (settledRecords.length > 0) {
      sheet.addRow(['已结算工作记录']);
      sheet.addRow(['日期', '规格', '块数', '板数', '工资', '结算日期']);
      settledRecords.forEach((record) => {
        sheet.addRow([
          record.date,
          record.spec || '',
          record.blocks,
          record.packages,
          record.wage || 0,
          record.settled_at || ''
        ]);
      });
    }

    sheet.columns = [
      { width: 15 },
      { width: 20 },
    ];
  }

  const blob = await workbook.xlsx.writeBuffer();
  const filename = `工人详情_${dateRange?.start || '全部'}_${dateRange?.end || '全部'}.xlsx`;
  downloadBlob(new Blob([blob]), filename);
}

export async function exportLoanRecordsToExcel(
  records: LoanRecord[],
  dateRange?: { start: string; end: string }
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('借资记录');

  sheet.addRow(['姓名', '日期', '金额', '理由']);
  records.forEach((record) => {
    sheet.addRow([record.worker_name || '', record.loan_date, record.amount, record.reason || '']);
  });

  sheet.columns = [
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 30 },
  ];

  const blob = await workbook.xlsx.writeBuffer();
  const filename = `借资记录_${dateRange?.start || '全部'}_${dateRange?.end || '全部'}.xlsx`;
  downloadBlob(new Blob([blob]), filename);
}

export async function exportWorkRecordsToExcel(
  records: WorkRecord[],
  isSettled: boolean,
  dateRange?: { start: string; end: string }
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('工作记录');

  sheet.addRow(['姓名', '日期', '规格', '块数', '板数', '工资', '结算状态']);
  records.forEach((record) => {
    sheet.addRow([
      record.worker_name || '',
      record.date,
      record.spec || '',
      record.blocks,
      record.packages,
      record.wage || 0,
      record.is_settled ? '已结算' : '未结算'
    ]);
  });

  sheet.columns = [
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 10 },
    { width: 10 },
    { width: 15 },
    { width: 10 },
  ];

  const blob = await workbook.xlsx.writeBuffer();
  const status = isSettled ? '已结算' : '未结算';
  const filename = `工作记录${status}_${dateRange?.start || '全部'}_${dateRange?.end || '全部'}.xlsx`;
  downloadBlob(new Blob([blob]), filename);
}

export async function exportMaterialRecordsToExcel(
  records: MaterialRecord[],
  materialType: string,
  dateRange?: { start: string; end: string },
  images?: Map<string, string>
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('物料记录');

  const headers = ['姓名', '名称', '日期'];
  if (materialType === 'cement' || materialType === 'sand') {
    headers.push('数量(吨)', '单价', '金额');
  } else if (materialType === 'freight') {
    headers.push('规格', '数量(块)', '包数', '单价1', '单价2', '金额', '车号', '票号');
  } else if (materialType === 'external_brick' || materialType === 'internal_brick') {
    headers.push('规格', '数量(块)', '包数', '颜色', '单价', '金额', '司机', '车号');
  } else if (materialType === 'site_supply') {
    headers.push('规格', '颜色', '数量', '单位', '单价', '金额', '票号');
  }
  headers.push('图片');

  sheet.addRow(headers);

  const imagePromises: Promise<void>[] = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const row: any[] = [record.worker_name || '', record.name, record.date];

    if (materialType === 'cement' || materialType === 'sand') {
      row.push(record.quantity_tons || 0, record.unit_price || 0, record.total_amount || 0);
    } else if (materialType === 'freight') {
      row.push(
        record.spec || '',
        record.quantity_blocks || 0,
        record.packages || 0,
        record.unit_price_1 || 0,
        record.unit_price_2 || 0,
        record.total_amount || 0,
        record.vehicle_number || '',
        record.ticket_number || ''
      );
    } else if (materialType === 'external_brick' || materialType === 'internal_brick') {
      row.push(
        record.spec || '',
        record.quantity_blocks || 0,
        record.packages || 0,
        record.color || '',
        record.unit_price || 0,
        record.total_amount || 0,
        record.driver || '',
        record.vehicle_number || ''
      );
    } else if (materialType === 'site_supply') {
      row.push(
        record.spec || '',
        record.color || '',
        record.quantity || 0,
        record.quantity_unit || '',
        record.unit_price || 0,
        record.amount || 0,
        record.ticket_number || ''
      );
    }

    const currentRowIndex = i + 2;
    const imageUrl = images?.get(record.id);

    if (imageUrl) {
      row.push('有图片');

      const imagePromise = (async () => {
        try {
          const response = await fetch(imageUrl);
          if (!response.ok) {
            console.warn(`[Excel] Failed to fetch image: ${imageUrl}`);
            return;
          }
          const blob = await response.blob();
          const base64 = await blobToBase64(blob);
          const base64Data = base64.split(',')[1];

          const imageId = workbook.addImage({
            base64: base64Data,
            extension: 'png',
          });

          sheet.addImage(imageId, {
            tl: { col: headers.length - 1, row: currentRowIndex - 1 },
            ext: { width: 100, height: 100 },
          });
        } catch (error) {
          console.warn(`[Excel] Failed to add image for record ${record.id}:`, error);
        }
      })();

      imagePromises.push(imagePromise);
    } else {
      row.push('');
    }

    sheet.addRow(row);
  }

  await Promise.all(imagePromises);

  sheet.columns = headers.map(() => ({ width: 15 }));
  sheet.getColumn(headers.length - 1).width = 15;

  const blob = await workbook.xlsx.writeBuffer();
  const filename = `${materialType}_${dateRange?.start || '全部'}_${dateRange?.end || '全部'}.xlsx`;
  downloadBlob(new Blob([blob]), filename);
}