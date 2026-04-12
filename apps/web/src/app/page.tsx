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
            <img src="/decor-book.png" alt="" className={`${styles.heroDecor} ${styles.heroDecorBook}`} aria-hidden="true" />
            <img src="/decor-prince.png" alt="" className={`${styles.heroDecor} ${styles.heroDecorPrince}`} aria-hidden="true" />
            <img src="/decor-planets.png" alt="" className={`${styles.heroDecor} ${styles.heroDecorPlanets}`} aria-hidden="true" />
            <img src="/decor-fox.png" alt="" className={`${styles.heroDecor} ${styles.heroDecorFox}`} aria-hidden="true" />
            <div className={styles.heroContent}>
              <h1>
                <span className={styles.heroTitleMain}>Творческое пространство</span>
                <span className={styles.heroTitleBrand}>«На&nbsp;Заре»</span>
              </h1>
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
              <img src="/decor-stars-pair.png" alt="" className={`${styles.sectionDecor} ${styles.sectionDecorStarsPair}`} aria-hidden="true" />
              <img src="/decor-stars.png" alt="" className={`${styles.sectionDecor} ${styles.sectionDecorMoon}`} aria-hidden="true" />
              <NewsSlider news={news} />
            </section>
            <section id="events" className={styles.sectionBlock}>
              <img src="/decor-easel.png" alt="" className={`${styles.sectionDecor} ${styles.sectionDecorEasel}`} aria-hidden="true" />
              <img src="/decor-dome.png" alt="" className={`${styles.sectionDecor} ${styles.sectionDecorDome}`} aria-hidden="true" />
              <UpcomingEvents events={events} />
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
