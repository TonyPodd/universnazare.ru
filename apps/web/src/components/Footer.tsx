import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <div className={styles.brandName}>На заре</div>
          <div className={styles.brandDesc}>Творческое пространство «На Заре»</div>
        </div>

        <div className={styles.contacts}>
          <a href="https://yandex.ru/maps/?text=Новая заря, 15" target="_blank" rel="noopener noreferrer" className={styles.contactLink}>Новая заря, 15</a>
          <span className={styles.separator}>·</span>
          <a href="tel:+79164468385" className={styles.contactLink}>+7 916 446 8385</a>
          <span className={styles.separator}>·</span>
          <a href="mailto:nazare@univers.su" className={styles.contactLink}>nazare@univers.su</a>
        </div>

        <div className={styles.meta}>
          <div className={styles.social}>
            <a href="https://vk.com/do_univers" target="_blank" rel="noopener noreferrer" aria-label="VK">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.14C2 20.67 3.33 22 8.93 22h6.14c5.6 0 6.93-1.33 6.93-6.93V8.93C22 3.33 20.67 2 15.07 2zm3.15 14.1h-1.34c-.53 0-.69-.43-1.64-1.37-.83-.83-1.2-.94-1.41-.94-.29 0-.37.08-.37.47v1.25c0 .33-.11.53-1 .53-1.47 0-3.11-.89-4.26-2.53-1.72-2.37-2.19-4.15-2.19-4.51 0-.21.08-.41.47-.41h1.34c.35 0 .48.16.62.54.68 1.98 1.84 3.72 2.31 3.72.18 0 .26-.08.26-.54v-2.11c-.06-.96-.56-1.04-.56-1.38 0-.17.14-.34.36-.34h2.1c.3 0 .4.16.4.5v2.85c0 .3.13.4.21.4.18 0 .33-.1.67-.44 1.04-1.16 1.78-2.96 1.78-2.96.1-.2.26-.41.66-.41h1.34c.4 0 .49.21.4.5-.16.73-1.79 3.15-1.79 3.15-.15.24-.21.35 0 .62.15.2.65.64 1 1.04.6.69 1.06 1.27 1.18 1.67.12.4-.07.6-.47.6z"/>
              </svg>
            </a>
            <a href="https://t.me/univers_nazare" target="_blank" rel="noopener noreferrer" aria-label="Telegram">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
              </svg>
            </a>
          </div>
          <div className={styles.legal}>
            <a href="/privacy">Политика</a>
            <span className={styles.separator}>·</span>
            <a href="/terms">Оферта</a>
            <span className={styles.separator}>·</span>
            <a href="/payments">Оплата и доставка</a>
            <span className={styles.separator}>·</span>
            <a href="/requisites">Реквизиты</a>
            <span className={styles.separator}>·</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
