'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import styles from './Header.module.css';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { getTotalItems, clearCart } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);

  const navLinks = [
    { href: '/calendar', label: 'Календарь' },
    { href: '/groups', label: 'Направления' },
    { href: '/masters', label: 'Наши мастера' },
    { href: '/shop', label: 'Магазин' },
  ];

  const profileLinks = [
    { href: '/profile', label: 'Мой профиль' },
    { href: '/profile?tab=upcoming', label: 'Предстоящие' },
    { href: '/profile?tab=subscriptions', label: 'Абонемент' },
    { href: '/profile?tab=enrollments', label: 'Направления' },
    { href: '/profile?tab=bookings', label: 'История' },
    { href: '/profile?tab=orders', label: 'Заказы' },
  ];

  const handleMenuClose = () => {
    setIsMenuOpen(false);
    setIsProfileMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
    setIsProfileMenuOpen(false);
  };

  const toggleProfileMenu = () => {
    setIsProfileMenuOpen((prev) => !prev);
  };

  const handleLogout = () => {
    clearCart();
    logout();
    setIsProfileMenuOpen(false);
    setIsMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!headerRef.current) {
        return;
      }

      const target = event.target as Node;
      if (!headerRef.current.contains(target)) {
        handleMenuClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleMenuClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <header className={styles.header} ref={headerRef}>
      <div className={styles.container}>
        <Link href="/" className={styles.logoWrapper}>
          <img src="/logo-na-zare.png" alt="На заре" className={styles.logoImage} />
          <span className={styles.logoText}>На заре</span>
        </Link>

        <nav className={`${styles.nav} ${isMenuOpen ? styles.navOpen : ''}`}>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={handleMenuClose}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={styles.authSection}>
          <Link href="/cart" className={styles.cartLink} aria-label="Корзина">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 2L7 6H3L5 20H19L21 6H17L15 2H9Z" />
              <circle cx="9" cy="20" r="1" />
              <circle cx="15" cy="20" r="1" />
            </svg>
            {getTotalItems() > 0 && <span className={styles.cartBadge}>{getTotalItems()}</span>}
          </Link>

          {isAuthenticated ? (
            <div className={styles.profileContainer}>
              <button
                className={styles.profileButton}
                onClick={toggleProfileMenu}
                aria-label="Профиль"
              >
                <div className={styles.avatar}>
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <span className={styles.userName}>
                  {user?.firstName}
                </span>
              </button>

              {isProfileMenuOpen && (
                <div className={styles.profileMenu}>
                  {profileLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={styles.profileMenuItem}
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <button
                    className={`${styles.profileMenuItem} ${styles.profileMenuLogout}`}
                    onClick={handleLogout}
                  >
                    Выйти
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className={styles.loginButton}>
              Войти
            </Link>
          )}
        </div>

        <button
          className={`${styles.burger} ${isMenuOpen ? styles.burgerOpen : ''}`}
          onClick={toggleMenu}
          aria-label="Меню"
          aria-expanded={isMenuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {isMenuOpen && (
        <div className={styles.mobileMenuOverlay} onClick={handleMenuClose}>
          <div className={styles.mobileMenuPanel} onClick={(event) => event.stopPropagation()}>
            <div className={styles.mobileMenuSection}>
              <p className={styles.mobileMenuTitle}>Разделы</p>
              <div className={styles.mobileMenuList}>
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={styles.mobileMenuItem}
                    onClick={handleMenuClose}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {isAuthenticated ? (
              <div className={styles.mobileMenuSection}>
                <p className={styles.mobileMenuTitle}>Аккаунт</p>
                <div className={styles.mobileMenuList}>
                  {profileLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={styles.mobileMenuItem}
                      onClick={handleMenuClose}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <button
                    className={`${styles.mobileMenuItem} ${styles.mobileMenuLogout}`}
                    onClick={handleLogout}
                  >
                    Выйти
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.mobileMenuSection}>
                <p className={styles.mobileMenuTitle}>Аккаунт</p>
                <div className={styles.mobileMenuList}>
                  <Link
                    href="/login"
                    className={styles.mobileMenuItem}
                    onClick={handleMenuClose}
                  >
                    Войти
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
