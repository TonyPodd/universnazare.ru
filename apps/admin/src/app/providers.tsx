'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { apiClient } from '../lib/api';

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Установить токен из localStorage при загрузке приложения
    const token = localStorage.getItem('token');

    if (token) {
      apiClient.setToken(token);
    } else if (pathname !== '/login') {
      // Если токена нет и это не страница логина - перенаправляем на логин
      router.push('/login');
    }

    setIsChecking(false);
  }, [pathname, router]);

  useEffect(() => {
    const handleUnauthorized = () => {
      try {
        localStorage.removeItem('token');
      } catch {
        // ignore
      }
      apiClient.clearToken();
      if (pathname !== '/login') {
        router.push('/login');
      }
    };

    window.addEventListener('mss:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('mss:unauthorized', handleUnauthorized);
  }, [pathname, router]);

  // Показываем загрузку пока проверяем токен
  if (isChecking && pathname !== '/login') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        Загрузка...
      </div>
    );
  }

  return <>{children}</>;
}
