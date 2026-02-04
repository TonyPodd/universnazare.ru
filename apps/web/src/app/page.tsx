import Header from '../components/Header';
import NewsSlider from '../components/NewsSlider';
import UpcomingEvents from '../components/UpcomingEvents';
import Footer from '../components/Footer';
import { apiClient } from '../lib/api';
import styles from './page.module.css';

// Перезапрашивать данные каждые 10 секунд (ISR - Incremental Static Regeneration)
export const revalidate = 10;

async function getHomePageData() {
  try {
    const [news, events] = await Promise.all([
      apiClient.news.getPublished(),
      apiClient.events.getUpcoming(5),
    ]);

    return { news, events };
  } catch (error) {
    console.error('Error fetching home page data:', error);
    return { news: [], events: [] };
  }
}

export default async function HomePage() {
  const { news, events } = await getHomePageData();

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <section className={styles.hero}>
            <div className={styles.heroContent}>
              <h1>Творческое пространство «На Заре»</h1>
              <p>Рисование • Лепка • Декор • Рукоделие</p>
              <div className={styles.heroMeta}>
                <div className={styles.heroMetaChip}>{events.length} ближайших событий</div>
                <div className={styles.heroMetaChip}>{news.length} новостей</div>
              </div>
              <div className={styles.heroButtons}>
                <a href="/calendar" className={styles.heroPrimary}>
                  Записаться на занятие
                </a>
                <a href="/groups" className={styles.heroSecondary}>
                  Все направления
                </a>
              </div>
            </div>
          </section>

          <div className={styles.sections}>
            <section className={styles.sectionBlock}>
              <NewsSlider news={news} />
            </section>
            <section id="events" className={styles.sectionBlock}>
              <UpcomingEvents events={events} />
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
