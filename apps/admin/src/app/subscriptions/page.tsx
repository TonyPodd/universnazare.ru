'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../lib/api';
import { SubscriptionType } from '@mss/shared';
import styles from './subscriptions.module.css';

export default function SubscriptionsPage() {
  const [subscriptionTypes, setSubscriptionTypes] = useState<SubscriptionType[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSubscriptionTypes = async () => {
    try {
      setLoading(true);
      const data = await apiClient.subscriptionTypes.getAll();
      setSubscriptionTypes(data);
    } catch (error: any) {
      console.error('Ошибка загрузки типов абонементов:', error);
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Не удалось загрузить типы абонементов';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptionTypes();
  }, []);

  const handleToggleActive = async (id: string) => {
    try {
      await apiClient.subscriptionTypes.toggleActive(id);
      await loadSubscriptionTypes();
    } catch (error: any) {
      console.error('Ошибка изменения статуса:', error);
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Не удалось изменить статус';
      alert(message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот тип абонемента?')) {
      return;
    }

    try {
      await apiClient.subscriptionTypes.delete(id);
      await loadSubscriptionTypes();
    } catch (error: any) {
      console.error('Ошибка удаления:', error);
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Не удалось удалить тип абонемента';
      alert(message);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Управление типами абонементов</h1>
          <p className={styles.subtitle}>Создавайте типы абонементов для покупки пользователями</p>
        </div>
        <Link href="/subscriptions/new" className={styles.addButton}>
          + Добавить тип абонемента
        </Link>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Название</th>
              <th>Цена</th>
              <th>Баланс</th>
              <th>Скидка</th>
              <th>Срок</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {subscriptionTypes.map((type) => {
              const discount = type.amount - type.price;
              const discountPercent = ((discount / type.amount) * 100).toFixed(0);

              return (
                <tr key={type.id}>
                  <td>
                    <div className={styles.typeInfo}>
                      <strong>{type.name}</strong>
                      {type.description && (
                        <small className={styles.description}>{type.description}</small>
                      )}
                    </div>
                  </td>
                  <td>{type.price} ₽</td>
                  <td>{type.amount} ₽</td>
                  <td>
                    <span className={styles.discount}>
                      {discount} ₽ ({discountPercent}%)
                    </span>
                  </td>
                  <td>{type.durationDays ? `${type.durationDays} дней` : 'Бессрочный'}</td>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        type.isActive ? styles.badgeActive : styles.badgeInactive
                      }`}
                    >
                      {type.isActive ? 'Активен' : 'Неактивен'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <Link href={`/subscriptions/${type.id}/edit`} className={styles.button}>
                        Редактировать
                      </Link>
                      <button
                        className={`${styles.button} ${styles.buttonToggle}`}
                        onClick={() => handleToggleActive(type.id)}
                      >
                        {type.isActive ? 'Деактивировать' : 'Активировать'}
                      </button>
                      <button
                        className={`${styles.button} ${styles.buttonDelete}`}
                        onClick={() => handleDelete(type.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {subscriptionTypes.length === 0 && (
        <div className={styles.empty}>
          <p>Типов абонементов пока нет</p>
          <Link href="/subscriptions/new" className={styles.addButton}>
            Добавить первый тип
          </Link>
        </div>
      )}
    </div>
  );
}
