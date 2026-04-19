'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Users,
  Briefcase,
  Package,
  FileDown,
  User,
  LogOut,
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userData));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  const navItems = [
    { href: '/dashboard/workers', label: '工人', icon: Users },
    { href: '/dashboard/work', label: '工作', icon: Briefcase },
    { href: '/dashboard/materials', label: '物料', icon: Package },
    { href: '/dashboard/export', label: '导出', icon: FileDown },
    { href: '/dashboard/profile', label: '我的', icon: User },
  ];

  const isActive = (href: string) => pathname.startsWith(href);

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-primary">工地管理系统</h1>
          <button onClick={handleLogout} className="text-gray-500 hover:text-gray-700">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="pb-20">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full mobile-touch-target transition-colors',
                  isActive(item.href)
                    ? 'text-primary'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <Icon size={20} />
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}