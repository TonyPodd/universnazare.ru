'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { validatePhone, formatPhone } from '../../lib/validation';
import styles from './register.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    age: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (formData.password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      setError('Введите корректный номер телефона (например, +7 999 123-45-67)');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        age: formData.age ? parseInt(formData.age) : undefined,
        phone: formData.phone ? formatPhone(formData.phone) : undefined,
      });
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при регистрации');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Левая часть - Визуал */}
      <div className={styles.leftSide}>
        <div className={styles.visualContent}>
          <img src="/logo-na-zare.png" alt="На заре" className={styles.logoImage} />
        </div>
      </div>

      {/* Правая часть - Форма */}
      <div className={styles.rightSide}>
        <div className={styles.formWrapper}>
          <div className={styles.formContent}>
            <h1 className={styles.title}>Создайте аккаунт</h1>
            <p className={styles.subtitle}>Присоединяйтесь к нашему творческому сообществу</p>

            {error && (
              <div className={styles.error}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="firstName" className={styles.label}>
                Имя *
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                required
                className={styles.input}
                placeholder="Иван"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="lastName" className={styles.label}>
                Фамилия *
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                required
                className={styles.input}
                placeholder="Иванов"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              Email *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              className={styles.input}
              placeholder="your@email.com"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="phone" className={styles.label}>
              Телефон
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              className={styles.input}
              placeholder="+7 (999) 123-45-67"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="age" className={styles.label}>
              Возраст
            </label>
            <input
              id="age"
              name="age"
              type="number"
              min="0"
              max="150"
              value={formData.age}
              onChange={handleChange}
              className={styles.input}
              placeholder="Например, 25"
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="password" className={styles.label}>
                Пароль *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                className={styles.input}
                placeholder="••••••••"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword" className={styles.label}>
                Подтверждение *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className={styles.input}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={styles.submitButton}
          >
            {isLoading ? 'Регистрируем...' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className={styles.divider}>
          <span>или</span>
        </div>

        <div className={styles.links}>
          <p>
            Уже есть аккаунт?{' '}
            <Link href="/login" className={styles.link}>
              Войти
            </Link>
          </p>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}
