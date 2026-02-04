'use client';

import Link from 'next/link';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../lib/api';
import { Master } from '@mss/shared';
import ImageUpload from '../../../components/ImageUpload';
import styles from './event-form.module.css';
import { toKrasnoyarskOffsetDateTime } from '../../../lib/krasnoyarsk-time';

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [masters, setMasters] = useState<Master[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'MASTER_CLASS',
    startDate: '',
    endDate: '',
    maxParticipants: 10,
    price: 0,
    imageUrl: '',
    materials: '',
    difficulty: 'BEGINNER',
    masterId: '',
  });

  useEffect(() => {
    loadMasters();
  }, []);

  const loadMasters = async () => {
    try {
      const data = await apiClient.masters.getList();
      setMasters(data);
      if (data.length > 0) {
        setFormData((prev) => ({ ...prev, masterId: data[0].id }));
      }
    } catch (error) {
      console.error('Ошибка загрузки мастеров:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const eventData = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        // Always send with +07:00 so the backend validates and stores the intended business time.
        startDate: toKrasnoyarskOffsetDateTime(formData.startDate),
        endDate: toKrasnoyarskOffsetDateTime(formData.endDate),
        maxParticipants: Number(formData.maxParticipants),
        price: Number(formData.price),
        imageUrl: formData.imageUrl || null,
        materials: formData.materials
          .split(',')
          .map((m) => m.trim())
          .filter((m) => m),
        difficulty: formData.difficulty || null,
        masterId: formData.masterId,
      };

      await apiClient.events.create(eventData);
      router.push('/events');
    } catch (error) {
      console.error('Ошибка создания события:', error);
      alert('Не удалось создать событие');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Создать событие</h1>
        <Link href="/events" className={styles.backButton}>
          Назад к списку
        </Link>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="title">Название *</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="description">Описание *</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows={5}
            className={styles.textarea}
          />
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="type">Тип события *</label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              className={styles.select}
            >
              <option value="MASTER_CLASS">Мастер-класс</option>
              <option value="REGULAR_GROUP">Регулярная группа</option>
              <option value="ONE_TIME_EVENT">Разовое событие</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="difficulty">Сложность</label>
            <select
              id="difficulty"
              name="difficulty"
              value={formData.difficulty}
              onChange={handleChange}
              className={styles.select}
            >
              <option value="">Не указано</option>
              <option value="BEGINNER">Начальный</option>
              <option value="INTERMEDIATE">Средний</option>
              <option value="ADVANCED">Продвинутый</option>
            </select>
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="startDate">Дата начала *</label>
            <input
              type="datetime-local"
              id="startDate"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="endDate">Дата окончания *</label>
            <input
              type="datetime-local"
              id="endDate"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              required
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="maxParticipants">Макс. участников *</label>
            <input
              type="number"
              id="maxParticipants"
              name="maxParticipants"
              value={formData.maxParticipants}
              onChange={handleChange}
              required
              min="1"
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="price">Цена (руб.) *</label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="masterId">Мастер *</label>
          <select
            id="masterId"
            name="masterId"
            value={formData.masterId}
            onChange={handleChange}
            required
            className={styles.select}
          >
            {masters.map((master) => (
              <option key={master.id} value={master.id}>
                {master.name}
              </option>
            ))}
          </select>
        </div>

        <ImageUpload
          currentImageUrl={formData.imageUrl}
          onImageChange={(url) => setFormData((prev) => ({ ...prev, imageUrl: url }))}
          label="Изображение события"
        />

        <div className={styles.formGroup}>
          <label htmlFor="materials">Материалы (через запятую)</label>
          <input
            type="text"
            id="materials"
            name="materials"
            value={formData.materials}
            onChange={handleChange}
            placeholder="глина, краски, кисти"
            className={styles.input}
          />
        </div>

        <div className={styles.formActions}>
          <button type="submit" disabled={loading} className={styles.submitButton}>
            {loading ? 'Создание...' : 'Создать событие'}
          </button>
          <Link href="/events" className={styles.cancelButton}>
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}
