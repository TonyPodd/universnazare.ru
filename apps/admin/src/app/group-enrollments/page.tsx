'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { RegularGroup } from '@mss/shared';
import { apiClient } from '../../lib/api';
import styles from './group-enrollments.module.css';

interface EnrollmentWithDetails {
  id: string;
  userId: string;
  groupId: string;
  subscriptionId?: string;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED';
  participants: unknown;
  contactEmail: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  participantsCount?: number;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  group?: {
    id: string;
    name: string;
  };
  subscription?: {
    id: string;
    remainingBalance: number;
    status: string;
  } | null;
}

interface Participant {
  fullName?: string;
  phone?: string;
  age?: number;
}

export default function GroupEnrollmentsPage() {
  const searchParams = useSearchParams();
  const groupIdFromQuery = searchParams?.get('groupId') || 'all';

  const [enrollments, setEnrollments] = useState<EnrollmentWithDetails[]>([]);
  const [groups, setGroups] = useState<RegularGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState(groupIdFromQuery);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setGroupFilter(groupIdFromQuery);
    setPage(1);
  }, [groupIdFromQuery]);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    loadEnrollments();
  }, [page, statusFilter, groupFilter, search]);

  const loadGroups = async () => {
    try {
      setLoadingGroups(true);
      const data = await apiClient.groups.getList();
      setGroups(data);
    } catch (error) {
      console.error('Ошибка загрузки направлений:', error);
      alert('Не удалось загрузить список направлений');
    } finally {
      setLoadingGroups(false);
    }
  };

  const loadEnrollments = async () => {
    try {
      setLoading(true);
      const result = await apiClient.groupEnrollments.getAdminPaginated(page, 20, {
        status: statusFilter === 'all' ? undefined : statusFilter,
        groupId: groupFilter === 'all' ? undefined : groupFilter,
        search: search || undefined,
      });
      setEnrollments(result.data as EnrollmentWithDetails[]);
      setTotal(result.total ?? 0);
      setTotalPages(result.totalPages || 1);
    } catch (error) {
      console.error('Ошибка загрузки записей на направления:', error);
      alert('Не удалось загрузить записи на направления');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const formatDate = (value: Date | string) => {
    const date = new Date(value);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ACTIVE: 'Активна',
      PAUSED: 'Пауза',
      CANCELLED: 'Отменена',
    };
    return labels[status] || status;
  };

  const getStatusClass = (status: string) => {
    const classes: Record<string, string> = {
      ACTIVE: styles.statusActive,
      PAUSED: styles.statusPaused,
      CANCELLED: styles.statusCancelled,
    };
    return classes[status] || '';
  };

  const getParticipantsText = (participantsRaw: unknown, countFromApi?: number) => {
    if (!Array.isArray(participantsRaw)) {
      return countFromApi ? `${countFromApi} участник(ов)` : '—';
    }
    const participants = participantsRaw as Participant[];
    if (participants.length === 0) return '—';
    return participants
      .map((item) => item.fullName || 'Без имени')
      .join(', ');
  };

  const hasFilters = useMemo(
    () => statusFilter !== 'all' || groupFilter !== 'all' || search.length > 0,
    [statusFilter, groupFilter, search],
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Записи на направления</h1>
          <p className={styles.subtitle}>Актуальный список участников с пагинацией</p>
        </div>
        <button onClick={loadEnrollments} className={styles.refreshButton} disabled={loading}>
          Обновить
        </button>
      </div>

      <div className={styles.filters}>
        <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
          <input
            type="text"
            placeholder="Поиск по имени, email, телефону, направлению..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchButton}>
            Найти
          </button>
        </form>

        <div className={styles.filterRow}>
          <select
            className={styles.select}
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value);
            }}
          >
            <option value="all">Все статусы</option>
            <option value="ACTIVE">Активные</option>
            <option value="PAUSED">На паузе</option>
            <option value="CANCELLED">Отмененные</option>
          </select>

          <select
            className={styles.select}
            value={groupFilter}
            disabled={loadingGroups}
            onChange={(e) => {
              setPage(1);
              setGroupFilter(e.target.value);
            }}
          >
            <option value="all">Все направления</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button
              className={styles.clearButton}
              onClick={() => {
                setPage(1);
                setStatusFilter('all');
                setGroupFilter('all');
                setSearch('');
                setSearchInput('');
              }}
            >
              Сбросить фильтры
            </button>
          )}
        </div>
      </div>

      <div className={styles.stats}>
        <span>Всего записей: {total}</span>
        <span>На странице: {enrollments.length}</span>
      </div>

      {loading ? (
        <div className={styles.loading}>Загрузка...</div>
      ) : enrollments.length === 0 ? (
        <div className={styles.empty}>Нет записей по выбранным фильтрам</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Дата записи</th>
                <th>Направление</th>
                <th>Пользователь</th>
                <th>Участники</th>
                <th>Email для связи</th>
                <th>Баланс абонемента</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((enrollment) => (
                <tr key={enrollment.id}>
                  <td>{formatDate(enrollment.createdAt)}</td>
                  <td>
                    {enrollment.group ? (
                      <Link href={`/groups/${enrollment.group.id}/edit`} className={styles.link}>
                        {enrollment.group.name}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {enrollment.user
                      ? `${enrollment.user.firstName} ${enrollment.user.lastName}`
                      : '—'}
                    <div className={styles.muted}>
                      {enrollment.user?.email || '—'}
                      {enrollment.user?.phone ? ` · ${enrollment.user.phone}` : ''}
                    </div>
                  </td>
                  <td>{getParticipantsText(enrollment.participants, enrollment.participantsCount)}</td>
                  <td>{enrollment.contactEmail || '—'}</td>
                  <td>
                    {enrollment.subscription
                      ? `${enrollment.subscription.remainingBalance.toFixed(2)} ₽`
                      : '—'}
                  </td>
                  <td>
                    <span className={`${styles.status} ${getStatusClass(enrollment.status)}`}>
                      {getStatusLabel(enrollment.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageButton}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1 || loading}
          >
            Назад
          </button>
          <span className={styles.pageInfo}>
            Страница {page} из {totalPages}
          </span>
          <button
            className={styles.pageButton}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages || loading}
          >
            Вперёд
          </button>
        </div>
      )}
    </div>
  );
}
