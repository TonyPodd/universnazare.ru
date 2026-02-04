'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../lib/api';
import { User, Subscription } from '@mss/shared';
import styles from './users.module.css';

interface UserWithSubscriptions extends User {
  subscriptions: Subscription[];
  _count: {
    bookings: number;
    orders: number;
  };
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithSubscriptions[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithSubscriptions | null>(null);
  const [addBalanceAmount, setAddBalanceAmount] = useState('');
  const [isAddingBalance, setIsAddingBalance] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, [currentPage, search]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await apiClient.users.getAllUsers(currentPage, 20, search);
      setUsers(data.users as UserWithSubscriptions[]);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
      alert('Не удалось загрузить пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadUsers();
  };

  const handleAddBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !addBalanceAmount) return;

    const amount = parseFloat(addBalanceAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Введите корректную сумму');
      return;
    }

    setIsAddingBalance(true);
    try {
      await apiClient.users.addBalance(selectedUser.id, amount);
      alert(`Баланс пользователя пополнен на ${amount} ₽`);
      setSelectedUser(null);
      setAddBalanceAmount('');
      await loadUsers();
    } catch (error: any) {
      console.error('Ошибка пополнения баланса:', error);
      alert(error.response?.data?.message || 'Не удалось пополнить баланс');
    } finally {
      setIsAddingBalance(false);
    }
  };

  const handleDeleteUser = async (user: UserWithSubscriptions) => {
    if (!confirm(`Удалить пользователя ${user.firstName} ${user.lastName}?`)) {
      return;
    }

    try {
      setDeletingUserId(user.id);
      await apiClient.users.deleteUser(user.id);
      await loadUsers();
    } catch (error: any) {
      console.error('Ошибка удаления пользователя:', error);
      alert(error.response?.data?.message || 'Не удалось удалить пользователя');
    } finally {
      setDeletingUserId(null);
    }
  };

  const getTotalBalance = (user: UserWithSubscriptions) => {
    return user.subscriptions.reduce((sum, sub) => sum + sub.remainingBalance, 0);
  };

  if (loading && users.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Загрузка пользователей...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Пользователи</h1>
      </div>

      <div className={styles.toolbar}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="text"
            placeholder="Поиск по имени, email или телефону..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchButton}>
            Найти
          </button>
        </form>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Имя</th>
              <th>Email</th>
              <th>Телефон</th>
              <th>Баланс</th>
              <th>Записи</th>
              <th>Заказы</th>
              <th>Роль</th>
              <th>Дата регистрации</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  {user.firstName} {user.lastName}
                </td>
                <td>{user.email}</td>
                <td>{user.phone || '—'}</td>
                <td>
                  <span className={styles.balance}>
                    {getTotalBalance(user).toFixed(2)} ₽
                  </span>
                </td>
                <td>{user._count.bookings}</td>
                <td>{user._count.orders}</td>
                <td>
                  <span className={`${styles.roleBadge} ${styles[`role${user.role}`]}`}>
                    {user.role === 'ADMIN' ? 'Админ' : user.role === 'MASTER' ? 'Мастер' : 'Пользователь'}
                  </span>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString('ru-RU')}</td>
                <td>
                  <button
                    onClick={() => setSelectedUser(user)}
                    className={styles.addBalanceButton}
                  >
                    💰 Пополнить
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user)}
                    className={styles.deleteButton}
                    disabled={deletingUserId === user.id}
                  >
                    {deletingUserId === user.id ? 'Удаление...' : 'Удалить'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className={styles.pageButton}
          >
            ← Назад
          </button>
          <span className={styles.pageInfo}>
            Страница {currentPage} из {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={styles.pageButton}
          >
            Вперед →
          </button>
        </div>
      )}

      {selectedUser && (
        <div className={styles.modal} onClick={() => setSelectedUser(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Пополнить баланс</h2>
              <button
                onClick={() => setSelectedUser(null)}
                className={styles.closeButton}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.userInfo}>
                <p><strong>Пользователь:</strong> {selectedUser.firstName} {selectedUser.lastName}</p>
                <p><strong>Email:</strong> {selectedUser.email}</p>
                <p><strong>Текущий баланс:</strong> {getTotalBalance(selectedUser).toFixed(2)} ₽</p>
              </div>

              <form onSubmit={handleAddBalance} className={styles.form}>
                <div className={styles.formGroup}>
                  <label htmlFor="amount">Сумма пополнения (₽)</label>
                  <input
                    type="number"
                    id="amount"
                    step="0.01"
                    min="0.01"
                    value={addBalanceAmount}
                    onChange={(e) => setAddBalanceAmount(e.target.value)}
                    placeholder="Введите сумму"
                    required
                    className={styles.input}
                    autoFocus
                  />
                </div>

                <div className={styles.formActions}>
                  <button
                    type="submit"
                    disabled={isAddingBalance}
                    className={styles.submitButton}
                  >
                    {isAddingBalance ? 'Пополнение...' : 'Пополнить баланс'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className={styles.cancelButton}
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
