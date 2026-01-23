import Header from '../../components/Header';
import Footer from '../../components/Footer';
import styles from './requisites.module.css';

export const metadata = {
  title: 'Реквизиты - На заре',
  description: 'Реквизиты индивидуального предпринимателя творческой студии На заре',
};

export default function RequisitesPage() {
  return (
    <>
      <Header />
      <main className={styles.container}>
        <h1>Реквизиты</h1>

        <section className={styles.section}>
          <h2>Основные сведения</h2>
          <ul>
            <li>Вид предпринимательства: Индивидуальный предприниматель</li>
            <li>ОГРНИП: 322246800001404</li>
            <li>ИНН: 246210309397</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Регистрация</h2>
          <ul>
            <li>Дата регистрации: 12 января 2022 г.</li>
            <li>Регистратор: Межрайонная инспекция ФНС России № 23 по Красноярскому краю</li>
            <li>Дата постановки на учет: 28 ноября 2022 г.</li>
            <li>Налоговый орган: Межрайонная инспекция ФНС России № 27 по Красноярскому краю</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Сведения Росстата</h2>
          <ul>
            <li>ОКПО: 2013024592</li>
            <li>ОКАТО: 04401363000</li>
            <li>ОКТМО: 04701000001</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Регистрация в ПФР и ФСС</h2>
          <ul>
            <li>Регистрационный номер: 1219641246</li>
            <li>Дата регистрации: 13 января 2022 г.</li>
            <li>Территориальный орган: Отделение Фонда пенсионного и социального страхования РФ по Красноярскому краю</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Налоговый режим и МСП</h2>
          <ul>
            <li>Специальный налоговый режим: УСН</li>
            <li>Сведения МСП: включение в реестр 10 февраля 2022 г.</li>
            <li>Категория субъекта: микропредприятие</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Адрес и контакты</h2>
          <p>Адрес осуществления деятельности: Новая Заря, 15.</p>
          <p>
            Контакты для связи размещены на сайте в разделе «Контакты» и в подвале страницы.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
