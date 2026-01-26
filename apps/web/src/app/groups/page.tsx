'use client';

import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import EnrollmentForm from '../../components/EnrollmentForm';
import { apiClient } from '../../lib/api';
import { RegularGroup } from '@mss/shared';
import styles from './groups.module.css';

function formatSchedule(schedule: any): string {
  if (typeof schedule === 'string') return schedule;
  if (!schedule || !schedule.daysOfWeek || !schedule.time) return 'Не указано';

  const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  const days = schedule.daysOfWeek.map((d: number) => dayNames[d]).join(', ');
  return `${days} в ${schedule.time} (${schedule.duration} мин)`;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<RegularGroup[]>([]);
  const [hasUpcomingSessions, setHasUpcomingSessions] = useState<Record<string, boolean>>({});
  const [selectedGroup, setSelectedGroup] = useState<RegularGroup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const activeGroups = await apiClient.groups.getActive();
      setGroups(activeGroups);

      // Проверяем наличие предстоящих занятий для каждого направления
      const sessions: Record<string, boolean> = {};
      const now = new Date();
      const future = new Date();
      future.setDate(future.getDate() + 180); // 6 месяцев

      const allSessions = await apiClient.groupSessions.getAllSessions(now, future);

      for (const group of activeGroups) {
        // Проверяем, есть ли хоть одно предстоящее занятие
        const hasSession = allSessions.some(
          (s: any) => s.groupId === group.id && new Date(s.date) > now
        );
        sessions[group.id] = hasSession;
      }

      setHasUpcomingSessions(sessions);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = (group: RegularGroup) => {
    setSelectedGroup(group);
  };

  const handleCloseModal = () => {
    setSelectedGroup(null);
    loadData(); // Обновляем данные после записи
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.container}>
            <div className={styles.loading}>Загрузка направлений...</div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <section className={styles.hero}>
            <div className={styles.heroContent}>
              <h1>Постоянные направления</h1>
              <p>
                Регулярные занятия с опытными мастерами по фиксированному расписанию.
                Присоединяйтесь к нашим группам и развивайте свои творческие навыки!
              </p>
              <div className={styles.heroNote}>
                Это постоянные занятия, а не разовые мастер-классы
              </div>
            </div>
          </section>

          <section className={styles.groupsSection}>
            <div className={styles.groupsHeader}>
              <div>
                <h2 className={styles.groupsTitle}>Выберите направление</h2>
                <p className={styles.groupsSubtitle}>
                  Это регулярные занятия по расписанию. Запись и оплата происходят через абонемент.
                </p>
              </div>
              <div className={styles.groupsMeta}>
                <div className={styles.groupsCount}>{groups.length}</div>
                <div className={styles.groupsCountLabel}>активных направлений</div>
                <a href="/calendar" className={styles.groupsLink}>
                  Мастер-классы →
                </a>
              </div>
            </div>

            {groups.length === 0 ? (
              <div className={styles.empty}>
                <h2>Направлений пока нет</h2>
                <p>Следите за обновлениями на нашем сайте</p>
              </div>
            ) : (
              <div className={styles.groupsGrid}>
                {groups.map((group) => {
                  const hasSessions = hasUpcomingSessions[group.id];

                  return (
                    <div key={group.id} className={styles.groupCard}>
                      <div className={styles.groupHeader}>
                        <div className={styles.groupBadge}>Постоянное направление</div>
                        {group.imageUrl && (
                          <div className={styles.groupImage}>
                            <img
                              src={group.imageUrl.startsWith('http') ? group.imageUrl : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${group.imageUrl}`}
                              alt={group.name}
                            />
                          </div>
                        )}
                      </div>

                      <div className={styles.groupContent}>
                        <h2 className={styles.groupName}>{group.name}</h2>
                        <p className={styles.groupShort}>{group.shortDescription}</p>

                        <div className={styles.scheduleHighlight}>
                          <div className={styles.scheduleRow}>
                            <strong>Расписание:</strong>
                            <span>{formatSchedule(group.schedule)}</span>
                          </div>
                        </div>

                        <div className={styles.groupDetails}>
                          <div className={styles.detailItem}>
                            <span>До {group.maxParticipants} человек</span>
                          </div>
                          <div className={styles.detailItem}>
                            <span className={styles.detailText}>{group.price} ₽/занятие</span>
                          </div>
                        </div>

                        <div className={styles.groupDescription}>
                          <h3>О направлении</h3>
                          <p>{group.description}</p>
                        </div>

                        <div className={styles.groupActions}>
                          {hasSessions ? (
                            <button
                              onClick={() => handleEnroll(group)}
                              className={styles.primaryButton}
                            >
                              Записаться
                            </button>
                          ) : (
                            <div className={styles.noSessionsMessage}>
                              Занятия пока не запланированы
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />

      <EnrollmentForm group={selectedGroup} onClose={handleCloseModal} />
    </>
  );
}
