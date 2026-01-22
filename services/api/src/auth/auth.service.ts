import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  private transporter: nodemailer.Transporter;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {
    // Настройка nodemailer (в production использовать реальный SMTP)
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async register(registerDto: RegisterDto) {
    // Проверка существования пользователя
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Генерация токена подтверждения email
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Создание пользователя
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        password: hashedPassword,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        phone: registerDto.phone,
        age: registerDto.age,
        verificationToken,
        emailVerified: false,
      },
    });

    // Отправка email с подтверждением
    void this.sendVerificationEmail(user.email, verificationToken);

    // Генерация JWT токена
    const accessToken = this.generateAccessToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        age: user.age,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      accessToken,
    };
  }

  async login(loginDto: LoginDto) {
    // Поиск пользователя
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    // Проверка пароля
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    // Генерация JWT токена
    const accessToken = this.generateAccessToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        age: user.age,
        role: user.role,
        emailVerified: user.emailVerified,
        vkId: user.vkId,
        telegramId: user.telegramId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      accessToken,
    };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (!user) {
      throw new NotFoundException('Недействительный токен подтверждения');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
      },
    });

    return { message: 'Email успешно подтверждён' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Не раскрываем существование пользователя
      return { message: 'Если email существует, письмо было отправлено' };
    }

    // Генерация токена сброса пароля
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 час

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires,
      },
    });

    // Отправка email со ссылкой на сброс пароля
    await this.sendPasswordResetEmail(user.email, resetToken);

    return { message: 'Если email существует, письмо было отправлено' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException(
        'Недействительный или истёкший токен сброса пароля',
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return { message: 'Пароль успешно изменён' };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      age: user.age,
      role: user.role,
      emailVerified: user.emailVerified,
      vkId: user.vkId,
      telegramId: user.telegramId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private generateAccessToken(userId: string, email: string): string {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }

  private async sendVerificationEmail(email: string, token: string) {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/verify-email?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@mss-platform.com',
        to: email,
        subject: 'Подтверждение email - MSS Platform',
        html: `
          <h1>Подтверждение регистрации</h1>
          <p>Спасибо за регистрацию на MSS Platform!</p>
          <p>Пожалуйста, подтвердите ваш email, перейдя по ссылке:</p>
          <a href="${verificationUrl}">Подтвердить email</a>
          <p>Если вы не регистрировались на нашем сайте, проигнорируйте это письмо.</p>
        `,
      });
    } catch (error) {
      console.error('Ошибка отправки email:', error);
      // Не бросаем исключение, чтобы регистрация прошла успешно
    }
  }

  private async sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@mss-platform.com',
        to: email,
        subject: 'Сброс пароля - MSS Platform',
        html: `
          <h1>Сброс пароля</h1>
          <p>Вы запросили сброс пароля для вашего аккаунта.</p>
          <p>Пожалуйста, перейдите по ссылке для создания нового пароля:</p>
          <a href="${resetUrl}">Сбросить пароль</a>
          <p>Ссылка действительна в течение 1 часа.</p>
          <p>Если вы не запрашивали сброс пароля, проигнорируйте это письмо.</p>
        `,
      });
    } catch (error) {
      console.error('Ошибка отправки email:', error);
    }
  }
}
