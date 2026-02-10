'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../lib/api';
import { RegularGroup } from '@mss/shared';
import styles from './groups.module.css';

export default function GroupsPage() {
  const [groups, setGroups] = useState<RegularGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const formatSchedule = (schedule: any) => {
    if (typeof schedule === 'string') return schedule;
    if (!schedule || !schedule.daysOfWeek || !schedule.time) return 'Не указано';

    const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const days = schedule.daysOfWeek.map((d: number) => dayNames[d]).join(', ');
    return `${days} в ${schedule.time} (${schedule.duration} мин)`;
  };

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await apiClient.groups.getList();
      setGroups(data);
    } catch (error) {
      console.error('Ошибка загрузки направлений:', error);
      alert('Не удалось загрузить направления');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить это направление?')) {
      return;
    }

    try {
      await apiClient.groups.delete(id);
      await loadGroups();
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('Не удалось удалить направление');
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await apiClient.groups.toggleActive(id);
      await loadGroups();
    } catch (error) {
      console.error('Ошибка изменения статуса:', error);
      alert('Не удалось изменить статус направления');
    }
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Управление направлениями</h1>
          <p className={styles.subtitle}>Постоянные занятия с регулярным расписанием (не мастер-классы)</p>
        </div>
        <Link href="/groups/new" className={styles.addButton}>
          + Добавить направление
        </Link>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Название</th>
              <th>Расписание</th>
              <th>Цена</th>
              <th>Макс. участников</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.id}>
                <td>
                  <div className={styles.groupInfo}>
                    {group.imageUrl && (
                      <img src={group.imageUrl} alt={group.name} className={styles.image} />
                    )}
                    <div>
                      <div className={styles.groupName}>{group.name}</div>
                      <div className={styles.groupShort}>{group.shortDescription}</div>
                    </div>
                  </div>
                </td>
                <td>{formatSchedule(group.schedule)}</td>
                <td className={styles.price}>{group.price} ₽</td>
                <td className={styles.centered}>{group.maxParticipants}</td>
                <td>
                  <span
                    className={`${styles.badge} ${
                      group.isActive ? styles.badgeActive : styles.badgeInactive
                    }`}
                  >
                    {group.isActive ? 'Активно' : 'Неактивно'}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    <Link href={`/groups/${group.id}/edit`} className={styles.button}>
                      Редактировать
                    </Link>
                    <Link href={`/group-enrollments?groupId=${group.id}`} className={styles.button}>
                      Участники
                    </Link>
                    <button
                      className={`${styles.button} ${styles.buttonToggle}`}
                      onClick={() => handleToggleActive(group.id)}
                    >
                      {group.isActive ? 'Деактивировать' : 'Активировать'}
                    </button>
                    <button
                      className={`${styles.button} ${styles.buttonDelete}`}
                      onClick={() => handleDelete(group.id)}
                    >
                      Удалить
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {groups.length === 0 && (
        <div className={styles.empty}>
          <p>Направлений пока нет</p>
          <Link href="/groups/new" className={styles.addButton}>
            Добавить первое направление
          </Link>
        </div>
      )}
    </div>
  );
}
