'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { apiClient } from '../lib/api';
import styles from './Sidebar.module.css';
import { safeRemoveToken } from '../lib/token-storage';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { href: '/dashboard', label: 'Дашборд', icon: '📊' },
    { href: '/events', label: 'Мастер-классы', icon: '🎨' },
    { href: '/groups', label: 'Направления', icon: '🔵' },
    { href: '/subscriptions', label: 'Абонементы', icon: '💳' },
    { href: '/users', label: 'Пользователи', icon: '👥' },
    { href: '/masters', label: 'Мастера', icon: '👨‍🎨' },
    { href: '/news', label: 'Новости', icon: '📰' },
    { href: '/products', label: 'Товары', icon: '🛍️' },
    { href: '/orders', label: 'Заказы', icon: '📦' },
    { href: '/bookings', label: 'Записи на МК', icon: '📝' },
  ];

  const handleLogout = () => {
    safeRemoveToken();
    apiClient.clearToken();
    router.push('/login');
  };

  return (
    <>
      <button className={styles.burgerButton} onClick={() => setIsOpen(!isOpen)}>
        <span></span>
        <span></span>
        <span></span>
      </button>

      {isOpen && <div className={styles.overlay} onClick={() => setIsOpen(false)} />}

      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.logo}>
          <h2>MSS Admin</h2>
        </div>

        <nav className={styles.nav}>
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${pathname?.startsWith(item.href) ? styles.active : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <span className={styles.icon}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className={styles.logoutSection}>
          <button onClick={handleLogout} className={styles.logoutButton}>
            <span className={styles.icon}>🚪</span>
            <span>Выйти</span>
          </button>
        </div>
      </aside>
    </>
  );
}
