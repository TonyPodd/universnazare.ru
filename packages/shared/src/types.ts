// Типы событий в календаре
export enum EventType {
  MASTER_CLASS = 'MASTER_CLASS', // Мастер-классы (зеленые)
  REGULAR_GROUP = 'REGULAR_GROUP', // Постоянные занятия (синие)
  ONE_TIME_EVENT = 'ONE_TIME_EVENT', // Разовые события (оранжевые)
}

// Статус события
export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

// Статус записи пользователя
export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  ATTENDED = 'ATTENDED',
}

// Базовая информация о событии
export interface Event {
  id: string;
  title: string;
  description: string;
  type: EventType;
  status: EventStatus;
  startDate: Date;
  endDate: Date;
  maxParticipants: number;
  currentParticipants: number;
  price: number;
  imageUrl?: string;
  masterId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Событие для календаря (может быть как Event, так и GroupSession)
export interface CalendarEvent extends Event {
  groupSessionId?: string; // Если это занятие направления
}

// Мастер-класс (расширение Event)
export interface MasterClass extends Event {
  type: EventType.MASTER_CLASS;
  resultImages: string[];
  materials?: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

// Расписание направления
export interface GroupSchedule {
  daysOfWeek: number[]; // 0=Воскресенье, 1=Понедельник, ...6=Суббота
  time: string; // HH:MM формат (например "18:00")
  duration: number; // Продолжительность в минутах
}

// Постоянная группа (направление)
export interface RegularGroup {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  imageUrl?: string;
  schedule: GroupSchedule;
  price: number;
  maxParticipants: number;
  masterId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Статусы занятий направления
export enum SessionStatus {
  SCHEDULED = 'SCHEDULED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

// Занятие направления
export interface GroupSession {
  id: string;
  groupId: string;
  date: Date;
  duration: number;
  status: SessionStatus;
  currentParticipants: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Мастер
export interface Master {
  id: string;
  name: string;
  bio?: string;
  avatarUrl?: string;
  vkLink?: string;
  instagramLink?: string;
  telegramLink?: string;
  specializations: string[];
  rating?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Участник записи
export interface BookingParticipant {
  fullName: string;
  phone: string;
  age?: number;
}

// Способ оплаты
export enum PaymentMethod {
  SUBSCRIPTION = 'SUBSCRIPTION', // Оплата с абонемента
  ON_SITE = 'ON_SITE', // Оплата на месте
  ONLINE = 'ONLINE', // Онлайн-оплата
}

// Запись на событие или занятие направления
export interface Booking {
  id: string;
  userId?: string;
  eventId?: string; // Для мастер-классов
  groupSessionId?: string; // Для занятий направлений
  subscriptionId?: string;
  status: BookingStatus;
  participantsCount: number;
  totalPrice: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  participants: BookingParticipant[];
  contactEmail: string;
  createdAt: Date;
  updatedAt: Date;
  event?: Event; // Опционально включается при запросе
  groupSession?: GroupSession & { group?: RegularGroup }; // Опционально включается при запросе
  user?: Partial<User>; // Опционально включается при запросе
}

// DTO для создания записи на мастер-класс
export interface CreateBookingDto {
  eventId?: string; // Для мастер-классов
  groupSessionId?: string; // Для занятий направлений
  participants: BookingParticipant[];
  contactEmail: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  subscriptionId?: string; // Обязательно для направлений
}

// Пользователь
export interface User {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  age?: number;
  avatarUrl?: string;
  role: 'USER' | 'ADMIN' | 'MASTER';
  emailVerified: boolean;
  vkId?: string;
  telegramId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Товар в магазине
export interface Product {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  price: number;
  images: string[];
  category: string;
  stockQuantity: number;
  isAvailable: boolean;
  masterId?: string; // кто создал товар
  createdAt: Date;
  updatedAt: Date;
}

// Заказ в магазине
export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'READY' | 'COMPLETED' | 'CANCELLED';
  paymentMethod: PaymentMethod;
  paymentId?: string;
  paymentUrl?: string;
  paymentStatus?: string;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product?: {
    name: string;
  };
}

export interface Address {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

// Новость (для листалки на главной)
export interface News {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  isPublished: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Загруженный файл
export interface Upload {
  id: string;
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
  url: string;
  createdAt: Date;
}

// Статусы зачисления в группу
export enum EnrollmentStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

// Зачисление пользователя в постоянную группу
export interface GroupEnrollment {
  id: string;
  userId: string;
  groupId: string;
  subscriptionId?: string;
  status: EnrollmentStatus;
  enrolledAt: Date;
  expiresAt?: Date;
  notes?: string;
  participants: BookingParticipant[];
  contactEmail: string;
  createdAt: Date;
  updatedAt: Date;
  group?: RegularGroup; // Опционально включается при запросе
  subscription?: Subscription; // Опционально включается при запросе
}

// DTO для зачисления в группу
export interface CreateEnrollmentDto {
  groupId: string;
  participants: BookingParticipant[];
  contactEmail: string;
  subscriptionId?: string;
  notes?: string;
}

// Статусы абонементов
export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  DEPLETED = 'DEPLETED',
  CANCELLED = 'CANCELLED',
}

// Тип абонемента (шаблон для покупки)
export interface SubscriptionType {
  id: string;
  name: string;
  description: string;
  amount: number; // Сумма пополнения баланса (в рублях)
  price: number; // Стоимость (сколько нужно заплатить)
  durationDays?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Абонемент пользователя
export interface Subscription {
  id: string;
  userId: string;
  typeId: string;
  name: string;
  totalBalance: number; // Общий баланс в рублях
  remainingBalance: number; // Оставшийся баланс в рублях
  price: number;
  status: SubscriptionStatus;
  purchasedAt: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  subscriptionType?: SubscriptionType;
}

// Auth DTOs
export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface VerifyEmailDto {
  token: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export interface ForgotPasswordDto {
  email: string;
}
