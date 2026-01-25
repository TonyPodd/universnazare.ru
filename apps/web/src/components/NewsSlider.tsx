'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import styles from './NewsSlider.module.css';
import { News } from '@mss/shared';
import { getImageUrl } from '../lib/utils';

interface NewsSliderProps {
  news: News[];
}

function formatNewsDate(date: Date | string | undefined) {
  if (!date) {
    return '';
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function NewsSlider({ news }: NewsSliderProps) {
  if (!news || news.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Новостей пока нет</p>
      </div>
    );
  }

  return (
    <div className={styles.sliderWrapper}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Новости</h2>
          <p className={styles.subtitle}>
            Коротко о важных обновлениях, событиях и жизни студии.
          </p>
        </div>
        <a href="/calendar" className={styles.headerLink}>
          Календарь →
        </a>
      </div>
      <Swiper
        modules={[Pagination, Autoplay]}
        spaceBetween={20}
        slidesPerView={1}
        pagination={{ clickable: true }}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        className={styles.swiper}
      >
        {news.map((item) => (
          <SwiperSlide key={item.id}>
            <div className={`${styles.slide} ${!item.imageUrl ? styles.slideNoImage : ''}`}>
              {item.imageUrl && (
                <div
                  className={styles.slideImage}
                  style={{ backgroundImage: `url(${getImageUrl(item.imageUrl)})` }}
                />
              )}
              <div className={styles.slideContent}>
                <div className={styles.slideMeta}>
                  {formatNewsDate(item.publishedAt || item.createdAt)}
                </div>
                <h3>{item.title}</h3>
                <p>{item.content}</p>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
