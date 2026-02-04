'use client';

import { useState } from 'react';
import { CalendarEvent, EVENT_COLORS } from '@mss/shared';
import styles from './Calendar.module.css';

interface CalendarProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export default function Calendar({ events, onEventClick }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Получаем первый и последний день месяца
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Определяем с какого дня недели начинается месяц (0 = воскресенье, преобразуем в пн = 0)
  const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const daysInMonth = lastDay.getDate();

  // Названия месяцев и дней недели
  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];
  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  // Навигация по месяцам
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Получить события для конкретного дня
  const getEventsForDay = (day: number) => {
    const dayDate = new Date(year, month, day);
    return events.filter(event => {
      const eventDate = new Date(event.startDate);
      return eventDate.getDate() === day &&
             eventDate.getMonth() === month &&
             eventDate.getFullYear() === year;
    });
  };

  // Проверка, является ли день сегодняшним
  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() &&
           month === today.getMonth() &&
           year === today.getFullYear();
  };

  // Генерация дней календаря
  const calendarDays = [];

  // Пустые ячейки до первого дня месяца
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push(<div key={`empty-${i}`} className={styles.dayEmpty}></div>);
  }

  // Дни месяца
  for (let day = 1; day <= daysInMonth; day++) {
    const dayEvents = getEventsForDay(day);
    const isTodayClass = isToday(day) ? styles.today : '';
    const isSelectedClass = selectedDay === day ? styles.selected : '';
    const hasEvents = dayEvents.length > 0;

    calendarDays.push(
      <div
        key={day}
        className={`${styles.day} ${isTodayClass} ${isSelectedClass} ${hasEvents ? styles.hasEvents : ''}`}
        onClick={() => hasEvents && setSelectedDay(selectedDay === day ? null : day)}
      >
        <div className={styles.dayNumber}>{day}</div>
        {hasEvents && (
          <>
            {/* Точки для мобильных */}
            <div className={styles.eventDots}>
              {dayEvents.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  className={styles.eventDot}
                  style={{ backgroundColor: EVENT_COLORS[event.type] }}
                />
              ))}
              {dayEvents.length > 3 && (
                <div
                  className={styles.eventDot}
                  style={{ backgroundColor: '#8b7355' }}
                />
              )}
            </div>

            {/* Бейджи для desktop */}
            <div className={styles.eventIndicators}>
              {/* Показываем первое событие как бейдж */}
              {dayEvents.length > 0 && (() => {
                const firstEvent = dayEvents[0];
                const eventTime = new Date(firstEvent.startDate).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'Asia/Krasnoyarsk',
                });
                const availableSeats = firstEvent.maxParticipants - firstEvent.currentParticipants;
                const isLowSeats = availableSeats <= 3 && availableSeats > 0;

                return (
                  <div
                    className={`${styles.eventBadge} ${isLowSeats ? styles.lowSeats : ''}`}
                    style={{ backgroundColor: EVENT_COLORS[firstEvent.type] }}
                  >
                    {eventTime} {firstEvent.title.length > 8 ? firstEvent.title.substring(0, 8) + '...' : firstEvent.title}
                  </div>
                );
              })()}

              {/* Показываем количество оставшихся событий */}
              {dayEvents.length > 1 && (
                <div className={styles.eventCount}>
                  <span
                    className={styles.eventCountBadge}
                    style={{ backgroundColor: EVENT_COLORS[dayEvents[1].type] }}
                  >
                    {dayEvents.length - 1}
                  </span>
                  <span>ещё {dayEvents.length - 1}</span>
                </div>
              )}
            </div>

            {/* Тултип при наведении (desktop) */}
            <div className={styles.eventTooltip}>
              {dayEvents.slice(0, 2).map((event) => {
                const eventTime = new Date(event.startDate).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'Asia/Krasnoyarsk',
                });
                const availableSeats = event.maxParticipants - event.currentParticipants;

                return (
                  <div key={event.id} className={styles.tooltipEvent}>
                    <div className={styles.tooltipEventTitle}>{event.title}</div>
                    <div className={styles.tooltipEventTime}>{eventTime}</div>
                    {availableSeats <= 3 && availableSeats > 0 && (
                      <div className={styles.tooltipEventSeats}>
                        Осталось {availableSeats} {availableSeats === 1 ? 'место' : 'места'}
                      </div>
                    )}
                  </div>
                );
              })}
              {dayEvents.length > 2 && (
                <div className={styles.tooltipEvent}>
                  <div className={styles.tooltipEventTitle}>+{dayEvents.length - 2} ещё</div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // Получить события выбранного дня
  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <button onClick={goToPreviousMonth} className={styles.navButton}>
          ←
        </button>
        <div className={styles.headerCenter}>
          <h2 className={styles.monthTitle}>
            {monthNames[month]} {year}
          </h2>
          <button onClick={goToToday} className={styles.todayButton}>
            Сегодня
          </button>
        </div>
        <button onClick={goToNextMonth} className={styles.navButton}>
          →
        </button>
      </div>

      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.legendColor} style={{ backgroundColor: EVENT_COLORS.MASTER_CLASS }}></span>
          <span>Мастер-классы</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendColor} style={{ backgroundColor: EVENT_COLORS.REGULAR_GROUP }}></span>
          <span>Постоянные группы</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendColor} style={{ backgroundColor: EVENT_COLORS.ONE_TIME_EVENT }}></span>
          <span>Разовые события</span>
        </div>
      </div>

      <div className={styles.weekDays}>
        {dayNames.map(day => (
          <div key={day} className={styles.weekDay}>
            {day}
          </div>
        ))}
      </div>

      <div className={styles.days}>
        {calendarDays}
      </div>

      {selectedDay && selectedDayEvents.length > 0 && (
        <div className={styles.selectedDayEvents}>
          <h3 className={styles.selectedDayTitle}>
            События на {selectedDay} {monthNames[month].toLowerCase()}
          </h3>
          <div className={styles.eventsList}>
            {selectedDayEvents.map(event => {
              const eventTime = new Date(event.startDate).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Krasnoyarsk',
              });
              const seatsLeft = event.maxParticipants - event.currentParticipants;

              return (
                <div
                  key={event.id}
                  className={styles.eventCard}
                  onClick={() => onEventClick(event)}
                >
                  <div
                    className={styles.eventCardBadge}
                    style={{ backgroundColor: EVENT_COLORS[event.type] }}
                  />
                  <div className={styles.eventCardContent}>
                    <h4 className={styles.eventCardTitle}>{event.title}</h4>
                    <div className={styles.eventCardMeta}>
                      <span className={styles.eventCardChip}>{eventTime}</span>
                      <span className={styles.eventCardChip}>Мест: {seatsLeft}</span>
                    </div>
                    <p className={styles.eventCardDescription}>
                      {event.description.length > 80
                        ? event.description.substring(0, 80) + '...'
                        : event.description}
                    </p>
                    <div className={styles.eventCardFooter}>
                      <span className={styles.eventCardPrice}>{event.price} ₽</span>
                      <span className={styles.eventCardAction}>Подробнее</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
