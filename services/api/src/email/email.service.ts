import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  private getBusinessTimeZone(): string {
    // Keep all user-facing email times consistent with the studio timezone.
    return process.env.BUSINESS_TIMEZONE || 'Asia/Krasnoyarsk';
  }

  private getBrandName(): string {
    return process.env.BUSINESS_NAME || 'Творческое пространство «На Заре»';
  }

  private getSupportPhone(): { href: string; text: string } {
    // Defaults match the website footer.
    const raw = (process.env.BUSINESS_PHONE || '+79164468385').trim();
    const href = `tel:${raw.replace(/\s+/g, '')}`;
    const text = (process.env.BUSINESS_PHONE_TEXT || '+7 916 446 8385').trim();
    return { href, text };
  }

  private getSupportEmail(): { href: string; text: string } {
    // Defaults match the website footer.
    const email = (process.env.BUSINESS_EMAIL || 'nazare@univers.su').trim();
    return { href: `mailto:${email}`, text: email };
  }

  private getSupportContactsHtml(): string {
    const phone = this.getSupportPhone();
    const email = this.getSupportEmail();
    return `<a href="${phone.href}" style="color:#5a4a42;text-decoration:none;">${phone.text}</a> • <a href="${email.href}" style="color:#5a4a42;text-decoration:none;">${email.text}</a>`;
  }

  private formatCurrency(value: number): string {
    if (!Number.isFinite(value)) return '0';
    const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
    return rounded.toFixed(2).replace(/\.00$/, '');
  }

  constructor() {
    // Для разработки используем ethereal.email (тестовый SMTP)
    // В продакшене нужно настроить реальный SMTP сервер через переменные окружения
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
      // Продакшен конфигурация
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      this.logger.log('Email service initialized with production SMTP');
    } else {
      // Разработка - используем тестовый аккаунт
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      this.logger.log(
        `Email service initialized with test account: ${testAccount.user}`,
      );
      this.logger.log('Preview emails at: https://ethereal.email');
    }
  }

  async sendMasterClassBookingEmail(
    to: string,
    bookingData: {
      eventTitle: string;
      startDate: Date;
      endDate: Date;
      price: number;
      participants: Array<{ fullName: string; phone: string; age?: number }>;
      totalPrice: number;
      paymentMethod: 'SUBSCRIPTION' | 'ON_SITE';
      notes?: string;
    },
  ): Promise<void> {
    const formattedDate = new Intl.DateTimeFormat('ru-RU', {
      timeZone: this.getBusinessTimeZone(),
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(bookingData.startDate));

    const formattedTime = new Intl.DateTimeFormat('ru-RU', {
      timeZone: this.getBusinessTimeZone(),
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(bookingData.startDate));

    const getDuration = (start: Date, end: Date) => {
      const durationMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
      if (durationMinutes < 60) {
        return `${durationMinutes} минут`;
      }
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      if (minutes === 0) {
        return `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}`;
      }
      return `${hours},${Math.floor(minutes / 6)} часа`;
    };

    const duration = getDuration(bookingData.startDate, bookingData.endDate);

    const paymentMethodText = bookingData.paymentMethod === 'SUBSCRIPTION'
      ? 'Абонемент (скидка 10%)'
      : 'Оплата на месте';

    const participantsList = bookingData.participants
      .map((p, index) => {
        const ageText = p.age ? `, ${p.age} ${p.age === 1 ? 'год' : p.age < 5 ? 'года' : 'лет'}` : '';
        return `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">
              <strong>Участник ${index + 1}:</strong>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">
              ${p.fullName}${ageText}<br>
              <span style="color: #666; font-size: 14px;">${p.phone}</span>
            </td>
          </tr>
        `;
      })
      .join('');

    const mailOptions = {
      from: process.env.SMTP_FROM || `"На заре" <${this.getSupportEmail().text}>`,
      to,
      subject: `Подтверждение записи: ${bookingData.eventTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #faf8f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #faf8f6; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);">

                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #feb297 0%, #f09674 100%); padding: 40px 40px 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                        Запись подтверждена!
                      </h1>
                      <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.95); font-size: 16px;">
                        Ждём вас на мастер-классе
                      </p>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">

                      <!-- Event Title -->
                      <div style="background: rgba(247, 235, 225, 0.4); border-radius: 12px; padding: 20px; margin-bottom: 30px; border: 1px solid rgba(139, 115, 85, 0.15);">
                        <div style="color: #8b7355; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                          Мастер-класс
                        </div>
                        <h2 style="margin: 0; color: #2d3748; font-size: 24px; font-weight: 700;">
                          ${bookingData.eventTitle}
                        </h2>
                      </div>

                      <!-- Event Details -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                        <tr>
                          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                            <span style="color: #8b7b70; font-size: 15px;">📅 Дата:</span>
                          </td>
                          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">
                            <strong style="color: #5a4a42; font-size: 15px;">${formattedDate}</strong>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                            <span style="color: #8b7b70; font-size: 15px;">🕐 Время:</span>
                          </td>
                          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">
                            <strong style="color: #5a4a42; font-size: 15px;">${formattedTime}</strong>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                            <span style="color: #8b7b70; font-size: 15px;">⏱ Длительность:</span>
                          </td>
                          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">
                            <strong style="color: #5a4a42; font-size: 15px;">${duration}</strong>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                            <span style="color: #8b7b70; font-size: 15px;">💳 Оплата:</span>
                          </td>
                          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">
                            <strong style="color: #5a4a42; font-size: 15px;">${paymentMethodText}</strong>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 12px 0;">
                            <span style="color: #8b7b70; font-size: 15px;">💰 Стоимость:</span>
                          </td>
                          <td style="padding: 12px 0; text-align: right;">
                            <strong style="color: #d97757; font-size: 18px;">${this.formatCurrency(bookingData.totalPrice)} ₽</strong>
                          </td>
                        </tr>
                      </table>

                      <!-- Participants -->
                      <div style="margin-bottom: 30px;">
                        <h3 style="color: #2d3748; font-size: 18px; font-weight: 600; margin: 0 0 16px;">
                          Участники (${bookingData.participants.length})
                        </h3>
                        <table width="100%" cellpadding="0" cellspacing="0" style="background: #fafafa; border-radius: 8px; overflow: hidden;">
                          ${participantsList}
                        </table>
                      </div>

                      ${bookingData.notes ? `
                      <!-- Notes -->
                      <div style="background: rgba(139, 115, 85, 0.05); border-left: 3px solid #8b7355; border-radius: 4px; padding: 16px; margin-bottom: 30px;">
                        <div style="color: #8b7355; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
                          КОММЕНТАРИЙ К ЗАПИСИ
                        </div>
                        <div style="color: #5a4a42; font-size: 15px; line-height: 1.6;">
                          ${bookingData.notes}
                        </div>
                      </div>
                      ` : ''}

                      <!-- Important Info -->
                      <div style="background: rgba(217, 119, 87, 0.08); border-radius: 8px; padding: 20px; margin-bottom: 30px; border: 1px solid rgba(217, 119, 87, 0.2);">
                        <div style="color: #d97757; font-weight: 600; margin-bottom: 10px; font-size: 15px;">
                          ⚠️ Важная информация
                        </div>
                        <ul style="margin: 0; padding-left: 20px; color: #5a4a42; font-size: 14px; line-height: 1.8;">
                          <li>Пожалуйста, приходите за 10 минут до начала мастер-класса</li>
                          ${bookingData.paymentMethod === 'ON_SITE' ? '<li>Оплата производится на месте перед началом мастер-класса</li>' : '<li>Оплата произведена через абонемент со скидкой 10%</li>'}
                          <li>При необходимости отмены, пожалуйста, предупредите нас заранее</li>
                          <li>Все необходимые материалы будут предоставлены на мастер-классе</li>
                        </ul>
                      </div>

                      <!-- Contact -->
                      <div style="text-align: center; padding: 20px 0; border-top: 1px solid #f0f0f0;">
                        <p style="margin: 0 0 8px; color: #8b7b70; font-size: 14px;">
                          Есть вопросы? Свяжитесь с нами:
                        </p>
                        <p style="margin: 0; color: #5a4a42; font-size: 15px; font-weight: 600;">
                          ${this.getSupportContactsHtml()}
                        </p>
                      </div>

                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #faf8f6; padding: 30px; text-align: center; border-top: 1px solid #f0f0f0;">
                      <p style="margin: 0 0 10px; color: #2d3748; font-size: 18px; font-weight: 600;">
                        До встречи на мастер-классе!
                      </p>
                      <p style="margin: 0; color: #8b7b70; font-size: 13px;">
                        С уважением, ${this.getBrandName()}
                      </p>
                    </td>
                  </tr>

                </table>

                <!-- Footer text -->
                <table width="600" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
                  <tr>
                    <td style="text-align: center; color: #8b7b70; font-size: 12px; line-height: 1.6;">
                      <p style="margin: 0;">
                        Вы получили это письмо, потому что записались на мастер-класс в ${this.getBrandName()}.<br>
                        Если у вас возникли вопросы, свяжитесь с нами по указанным выше контактам.
                      </p>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Master class booking confirmation email sent to ${to}: ${info.messageId}`);

      // Для тестового сервера выводим ссылку на просмотр
      if (!process.env.SMTP_HOST) {
        this.logger.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send master class booking confirmation email to ${to}:`, error);
      // Не прерываем процесс создания записи, если письмо не отправилось
      // Просто логируем ошибку
    }
  }

  async sendGroupSessionBookingEmail(
    to: string,
    bookingData: {
      groupName: string;
      startDate: Date;
      endDate: Date;
      price: number;
      participants: Array<{ fullName: string; phone: string; age?: number }>;
      totalPrice: number;
      paymentMethod: 'SUBSCRIPTION' | 'ON_SITE';
      notes?: string;
    },
  ): Promise<void> {
    const formattedDate = new Intl.DateTimeFormat('ru-RU', {
      timeZone: this.getBusinessTimeZone(),
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(bookingData.startDate));

    const formattedTime = new Intl.DateTimeFormat('ru-RU', {
      timeZone: this.getBusinessTimeZone(),
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(bookingData.startDate));

    const getDuration = (start: Date, end: Date) => {
      const durationMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
      if (durationMinutes < 60) {
        return `${durationMinutes} минут`;
      }
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      if (minutes === 0) {
        return `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}`;
      }
      return `${hours},${Math.floor(minutes / 6)} часа`;
    };

    const duration = getDuration(bookingData.startDate, bookingData.endDate);

    const paymentMethodText = bookingData.paymentMethod === 'SUBSCRIPTION'
      ? 'Абонемент (скидка 10%)'
      : 'Оплата на месте';

    const participantsList = bookingData.participants
      .map((p, index) => {
        const ageText = p.age ? `, ${p.age} ${p.age === 1 ? 'год' : p.age < 5 ? 'года' : 'лет'}` : '';
        return `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">
              <strong>Участник ${index + 1}:</strong>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">
              ${p.fullName}${ageText}<br>
              <span style="color: #666; font-size: 14px;">${p.phone}</span>
            </td>
          </tr>
        `;
      })
      .join('');

    const mailOptions = {
      from: process.env.SMTP_FROM || `"На заре" <${this.getSupportEmail().text}>`,
      to,
      subject: `Подтверждение записи на занятие: ${bookingData.groupName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #faf8f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #faf8f6; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);">

                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #feb297 0%, #f09674 100%); padding: 40px 40px 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                        Запись подтверждена!
                      </h1>
                      <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.95); font-size: 16px;">
                        Ждём вас на занятии направления
                      </p>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">

                      <!-- Group Title -->
                      <div style="background: rgba(247, 235, 225, 0.4); border-radius: 12px; padding: 20px; margin-bottom: 30px; border: 1px solid rgba(139, 115, 85, 0.15);">
                        <div style="color: #8b7355; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                          Занятие направления
                        </div>
                        <h2 style="margin: 0; color: #2d3748; font-size: 24px; font-weight: 700;">
                          ${bookingData.groupName}
                        </h2>
                      </div>

                      <!-- Session Details -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                        <tr>
                          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                            <span style="color: #8b7b70; font-size: 15px;">📅 Дата:</span>
                          </td>
                          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">
                            <strong style="color: #5a4a42; font-size: 15px;">${formattedDate}</strong>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                            <span style="color: #8b7b70; font-size: 15px;">🕐 Время:</span>
                          </td>
                          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">
                            <strong style="color: #5a4a42; font-size: 15px;">${formattedTime}</strong>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                            <span style="color: #8b7b70; font-size: 15px;">⏱ Длительность:</span>
                          </td>
                          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">
                            <strong style="color: #5a4a42; font-size: 15px;">${duration}</strong>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                            <span style="color: #8b7b70; font-size: 15px;">💳 Оплата:</span>
                          </td>
                          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">
                            <strong style="color: #5a4a42; font-size: 15px;">${paymentMethodText}</strong>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 12px 0;">
                            <span style="color: #8b7b70; font-size: 15px;">💰 Стоимость:</span>
                          </td>
                          <td style="padding: 12px 0; text-align: right;">
                            <strong style="color: #d97757; font-size: 18px;">${this.formatCurrency(bookingData.totalPrice)} ₽</strong>
                          </td>
                        </tr>
                      </table>

                      <!-- Participants -->
                      <div style="margin-bottom: 30px;">
                        <h3 style="color: #2d3748; font-size: 18px; font-weight: 600; margin: 0 0 16px;">
                          Участники (${bookingData.participants.length})
                        </h3>
                        <table width="100%" cellpadding="0" cellspacing="0" style="background: #fafafa; border-radius: 8px; overflow: hidden;">
                          ${participantsList}
                        </table>
                      </div>

                      ${bookingData.notes ? `
                      <!-- Notes -->
                      <div style="background: rgba(139, 115, 85, 0.05); border-left: 3px solid #8b7355; border-radius: 4px; padding: 16px; margin-bottom: 30px;">
                        <div style="color: #8b7355; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
                          КОММЕНТАРИЙ К ЗАПИСИ
                        </div>
                        <div style="color: #5a4a42; font-size: 15px; line-height: 1.6;">
                          ${bookingData.notes}
                        </div>
                      </div>
                      ` : ''}

                      <!-- Important Info -->
                      <div style="background: rgba(217, 119, 87, 0.08); border-radius: 8px; padding: 20px; margin-bottom: 30px; border: 1px solid rgba(217, 119, 87, 0.2);">
                        <div style="color: #d97757; font-weight: 600; margin-bottom: 10px; font-size: 15px;">
                          ⚠️ Важная информация
                        </div>
                        <ul style="margin: 0; padding-left: 20px; color: #5a4a42; font-size: 14px; line-height: 1.8;">
                          <li>Это одно из занятий направления «${bookingData.groupName}»</li>
                          <li>Пожалуйста, приходите за 10 минут до начала занятия</li>
                          ${bookingData.paymentMethod === 'ON_SITE' ? '<li>Оплата производится на месте перед началом занятия</li>' : '<li>Оплата произведена через абонемент со скидкой 10%</li>'}
                          <li>При пропуске занятия, средства не возвращаются</li>
                          <li>Все необходимые материалы будут предоставлены</li>
                        </ul>
                      </div>

                      <!-- Contact -->
                      <div style="text-align: center; padding: 20px 0; border-top: 1px solid #f0f0f0;">
                        <p style="margin: 0 0 8px; color: #8b7b70; font-size: 14px;">
                          Есть вопросы? Свяжитесь с нами:
                        </p>
                        <p style="margin: 0; color: #5a4a42; font-size: 15px; font-weight: 600;">
                          ${this.getSupportContactsHtml()}
                        </p>
                      </div>

                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #faf8f6; padding: 30px; text-align: center; border-top: 1px solid #f0f0f0;">
                      <p style="margin: 0 0 10px; color: #2d3748; font-size: 18px; font-weight: 600;">
                        До встречи на занятии!
                      </p>
                      <p style="margin: 0; color: #8b7b70; font-size: 13px;">
                        С уважением, ${this.getBrandName()}
                      </p>
                    </td>
                  </tr>

                </table>

                <!-- Footer text -->
                <table width="600" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
                  <tr>
                    <td style="text-align: center; color: #8b7b70; font-size: 12px; line-height: 1.6;">
                      <p style="margin: 0;">
                        Вы получили это письмо, потому что записались на занятие направления в ${this.getBrandName()}.<br>
                        Если у вас возникли вопросы, свяжитесь с нами по указанным выше контактам.
                      </p>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Group session booking confirmation email sent to ${to}: ${info.messageId}`);

      // Для тестового сервера выводим ссылку на просмотр
      if (!process.env.SMTP_HOST) {
        this.logger.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send group session booking confirmation email to ${to}:`, error);
      // Не прерываем процесс создания записи, если письмо не отправилось
      // Просто логируем ошибку
    }
  }

  async sendSessionCancellationEmail(
    to: string,
    userName: string,
    groupName: string,
    sessionDate: Date,
    reason?: string,
  ): Promise<void> {
    const formattedDate = new Intl.DateTimeFormat('ru-RU', {
      timeZone: this.getBusinessTimeZone(),
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(sessionDate));

    const mailOptions = {
      from: process.env.SMTP_FROM || `"На заре" <${this.getSupportEmail().text}>`,
      to,
      subject: `Отмена занятия: ${groupName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Уведомление об отмене занятия</h2>

          <p>Здравствуйте, ${userName}!</p>

          <p>К сожалению, занятие по направлению <strong>${groupName}</strong>, запланированное на <strong>${formattedDate}</strong>, отменено.</p>

          ${reason ? `<p><strong>Причина:</strong> ${reason}</p>` : ''}

          <p>Приносим свои извинения за доставленные неудобства.</p>

          <p>Все остальные занятия проходят по расписанию.</p>

          <hr style="border: 1px solid #eee; margin: 20px 0;">

          <p style="color: #666; font-size: 12px;">
            С уважением,<br>
            Команда ${this.getBrandName()}
          </p>
        </div>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent to ${to}: ${info.messageId}`);

      // Для тестового сервера выводим ссылку на просмотр
      if (!process.env.SMTP_HOST) {
        this.logger.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  async sendBalanceTopUpEmail(
    to: string,
    userData: {
      firstName: string;
      lastName: string;
    },
    topUpData: {
      amount: number;
      newBalance: number;
      previousBalance: number;
    },
  ): Promise<void> {
    // Правильное округление для избежания floating point ошибок
    const formatBalance = (value: number): string => {
      return (Math.round(value * 100) / 100).toFixed(2);
    };

    const mailOptions = {
      from: process.env.SMTP_FROM || `"На заре" <${this.getSupportEmail().text}>`,
      to,
      subject: 'Пополнение баланса абонемента',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #faf8f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #faf8f6; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);">

                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #27ae60 0%, #229954 100%); padding: 40px 40px 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                        💰 Баланс пополнен!
                      </h1>
                      <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.95); font-size: 16px;">
                        Ваш абонемент пополнен администратором
                      </p>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">

                      <p style="margin: 0 0 30px; color: #2d3748; font-size: 16px; line-height: 1.6;">
                        Здравствуйте, <strong>${userData.firstName} ${userData.lastName}</strong>!
                      </p>

                      <p style="margin: 0 0 30px; color: #5a4a42; font-size: 15px; line-height: 1.6;">
                        Администратор пополнил баланс вашего абонемента. Вы можете использовать средства для записи на мастер-классы и занятия направлений.
                      </p>

                      <!-- Balance Info -->
                      <div style="background: rgba(39, 174, 96, 0.08); border-radius: 12px; padding: 24px; margin-bottom: 30px; border: 1px solid rgba(39, 174, 96, 0.2);">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid rgba(39, 174, 96, 0.15);">
                              <span style="color: #5a4a42; font-size: 15px;">Сумма пополнения:</span>
                            </td>
                            <td style="padding: 12px 0; border-bottom: 1px solid rgba(39, 174, 96, 0.15); text-align: right;">
                              <strong style="color: #27ae60; font-size: 20px;">+${formatBalance(topUpData.amount)} ₽</strong>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid rgba(39, 174, 96, 0.15);">
                              <span style="color: #5a4a42; font-size: 15px;">Предыдущий баланс:</span>
                            </td>
                            <td style="padding: 12px 0; border-bottom: 1px solid rgba(39, 174, 96, 0.15); text-align: right;">
                              <span style="color: #8b7b70; font-size: 16px;">${formatBalance(topUpData.previousBalance)} ₽</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 12px 0;">
                              <span style="color: #2d3748; font-size: 16px; font-weight: 600;">Новый баланс:</span>
                            </td>
                            <td style="padding: 12px 0; text-align: right;">
                              <strong style="color: #27ae60; font-size: 22px;">${formatBalance(topUpData.newBalance)} ₽</strong>
                            </td>
                          </tr>
                        </table>
                      </div>

                      <!-- CTA Button -->
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.FRONTEND_URL || 'https://universnazare.ru'}/profile"
                           style="display: inline-block; background: linear-gradient(135deg, #feb297 0%, #f09674 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(254, 178, 151, 0.3);">
                          Перейти в профиль
                        </a>
                      </div>

                      <!-- Info Box -->
                      <div style="background: rgba(139, 115, 85, 0.05); border-radius: 8px; padding: 20px; margin-top: 30px; border-left: 3px solid #8b7355;">
                        <div style="color: #8b7355; font-weight: 600; margin-bottom: 10px; font-size: 15px;">
                          💡 Что можно сделать с балансом
                        </div>
                        <ul style="margin: 0; padding-left: 20px; color: #5a4a42; font-size: 14px; line-height: 1.8;">
                          <li>Записаться на мастер-классы со скидкой 10%</li>
                          <li>Забронировать места на занятиях направлений</li>
                          <li>Оплатить заказы товаров в магазине</li>
                        </ul>
                      </div>

                      <!-- Contact -->
                      <div style="text-align: center; padding: 20px 0; border-top: 1px solid #f0f0f0; margin-top: 30px;">
                        <p style="margin: 0 0 8px; color: #8b7b70; font-size: 14px;">
                          Есть вопросы? Свяжитесь с нами:
                        </p>
                        <p style="margin: 0; color: #5a4a42; font-size: 15px; font-weight: 600;">
                          ${this.getSupportContactsHtml()}
                        </p>
                      </div>

                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #faf8f6; padding: 30px; text-align: center; border-top: 1px solid #f0f0f0;">
                      <p style="margin: 0 0 10px; color: #2d3748; font-size: 18px; font-weight: 600;">
                        Спасибо, что с нами!
                      </p>
                      <p style="margin: 0; color: #8b7b70; font-size: 13px;">
                        С уважением, ${this.getBrandName()}
                      </p>
                    </td>
                  </tr>

                </table>

                <!-- Footer text -->
                <table width="600" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
                  <tr>
                    <td style="text-align: center; color: #8b7b70; font-size: 12px; line-height: 1.6;">
                      <p style="margin: 0;">
                        Вы получили это письмо, потому что администратор пополнил баланс вашего абонемента.<br>
                        Если у вас возникли вопросы, свяжитесь с нами по указанным выше контактам.
                      </p>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Balance top-up email sent to ${to}: ${info.messageId}`);

      // Для тестового сервера выводим ссылку на просмотр
      if (!process.env.SMTP_HOST) {
        this.logger.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send balance top-up email to ${to}:`, error);
      // Не прерываем процесс пополнения баланса, если письмо не отправилось
      // Просто логируем ошибку
    }
  }
}
