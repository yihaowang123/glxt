'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { ClickableImage } from './image-preview';

interface PhotoUploadProps {
  value?: string;
  onChange: (url: string | undefined) => void;
}

const QINIU_UPLOAD_URL = 'https://up-as0.qiniup.com';

export default function PhotoUpload({ value, onChange }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setProgress(0);

    try {
      console.log('[PhotoUpload] Step 1: Requesting uptoken from /api/upload');
      const tokenResponse = await fetch('/api/upload', {
        method: 'POST',
      });

      console.log('[PhotoUpload] Token response status:', tokenResponse.status);

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('[PhotoUpload] Failed to get uptoken:', errorText);
        throw new Error('获取上传凭证失败: ' + errorText);
      }

      const tokenData = await tokenResponse.json();
      console.log('[PhotoUpload] Received uptoken, domain:', tokenData.domain);

      const { uptoken, domain } = tokenData;
      const filename = `images/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      console.log('[PhotoUpload] Step 2: Uploading file to Qiniu:', filename);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('token', uptoken);
      formData.append('key', filename);

      const uploadResponse = await fetch(QINIU_UPLOAD_URL, {
        method: 'POST',
        body: formData,
      });

      console.log('[PhotoUpload] Qiniu upload response status:', uploadResponse.status);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('[PhotoUpload] Qiniu upload failed:', errorText);
        throw new Error('上传失败: ' + errorText);
      }

      const uploadResult = await uploadResponse.json();
      console.log('[PhotoUpload] Qiniu upload success:', uploadResult);

      const fileUrl = `${domain}/${filename}`;
      console.log('[PhotoUpload] Full file URL:', fileUrl);

      onChange(fileUrl);
      setProgress(100);
    } catch (error) {
      console.error('[PhotoUpload] Upload error:', error);
      alert('上传失败，请重试: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDelete = () => {
    if (confirm('确定要删除图片吗？')) {
      onChange(undefined);
    }
  };

  if (value) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">照片</label>
        <div className="relative inline-block">
          <ClickableImage
            src={value}
            alt="Preview"
            className="w-32 h-32 object-cover rounded-lg border"
          />
          <button
            onClick={handleDelete}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 z-10"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">照片</label>
      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {uploading ? (
            <>
              <Upload className="w-8 h-8 mb-2 text-gray-400 animate-pulse" />
              <p className="text-sm text-gray-500">上传中... {progress}%</p>
            </>
          ) : (
            <>
              <ImageIcon className="w-8 h-8 mb-2 text-gray-400" />
              <p className="text-sm text-gray-500">点击上传照片</p>
            </>
          )}
        </div>
        <input
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </label>
    </div>
  );
}