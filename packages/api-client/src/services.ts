import { ApiClient } from './client';
import {
  API_ROUTES,
  Event,
  MasterClass,
  RegularGroup,
  GroupSession,
  Master,
  Booking,
  Product,
  Order,
  News,
  User,
  Subscription,
  SubscriptionType,
  CreateBookingDto,
  BookingParticipant,
  GroupEnrollment,
  CreateEnrollmentDto,
} from '@mss/shared';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface CalendarEventsParams {
  startDate: string;
  endDate: string;
}

export class EventsService {
  constructor(private client: ApiClient) {}

  async getUpcoming(limit = 5): Promise<Event[]> {
    return this.client.get<Event[]>(`${API_ROUTES.EVENTS.UPCOMING}?limit=${limit}`);
  }

  async getCalendarEvents(params: CalendarEventsParams): Promise<Event[]> {
    return this.client.get<Event[]>(API_ROUTES.EVENTS.CALENDAR, { params });
  }

  async getById(id: string): Promise<MasterClass> {
    return this.client.get<MasterClass>(API_ROUTES.EVENTS.BY_ID(id));
  }

  async getList(page = 1, limit = 20): Promise<PaginatedResponse<Event>> {
    return this.client.get<PaginatedResponse<Event>>(API_ROUTES.EVENTS.LIST, {
      params: { page, limit },
    });
  }

  async create(data: any): Promise<Event> {
    return this.client.post<Event>(API_ROUTES.EVENTS.LIST, data);
  }

  async update(id: string, data: any): Promise<Event> {
    return this.client.patch<Event>(API_ROUTES.EVENTS.BY_ID(id), data);
  }

  async delete(id: string): Promise<void> {
    return this.client.delete<void>(API_ROUTES.EVENTS.BY_ID(id));
  }

  async publish(id: string): Promise<Event> {
    return this.client.post<Event>(`/events/${id}/publish`);
  }

  async cancel(id: string): Promise<Event> {
    return this.client.post<Event>(`/events/${id}/cancel`);
  }
}

export class BookingsService {
  constructor(private client: ApiClient) {}

  async create(data: CreateBookingDto): Promise<Booking> {
    return this.client.post<Booking>('/bookings', data);
  }

  async getList(): Promise<Booking[]> {
    return this.client.get<Booking[]>('/bookings');
  }

  async getById(id: string): Promise<Booking> {
    return this.client.get<Booking>(`/bookings/${id}`);
  }

  async cancel(id: string): Promise<Booking> {
    return this.client.patch<Booking>(`/bookings/${id}/cancel`, {});
  }

  async updateStatus(id: string, status: string): Promise<Booking> {
    return this.client.patch<Booking>(`/bookings/${id}/status`, { status });
  }

  async getMyUpcoming(): Promise<Booking[]> {
    return this.client.get<Booking[]>('/bookings/my/upcoming');
  }
}

export class MastersService {
  constructor(private client: ApiClient) {}

  async getActive(): Promise<Master[]> {
    return this.client.get<Master[]>(API_ROUTES.MASTERS.ACTIVE);
  }

  async getList(): Promise<Master[]> {
    return this.client.get<Master[]>(API_ROUTES.MASTERS.LIST);
  }

  async getById(id: string): Promise<Master> {
    return this.client.get<Master>(API_ROUTES.MASTERS.BY_ID(id));
  }

  async create(data: any): Promise<Master> {
    return this.client.post<Master>(API_ROUTES.MASTERS.LIST, data);
  }

  async update(id: string, data: any): Promise<Master> {
    return this.client.patch<Master>(API_ROUTES.MASTERS.BY_ID(id), data);
  }

  async delete(id: string): Promise<void> {
    return this.client.delete<void>(API_ROUTES.MASTERS.BY_ID(id));
  }
}

export class GroupsService {
  constructor(private client: ApiClient) {}

  async getActive(): Promise<RegularGroup[]> {
    return this.client.get<RegularGroup[]>(API_ROUTES.GROUPS.ACTIVE);
  }

  async getList(): Promise<RegularGroup[]> {
    return this.client.get<RegularGroup[]>(API_ROUTES.GROUPS.LIST);
  }

  async getById(id: string): Promise<RegularGroup> {
    return this.client.get<RegularGroup>(API_ROUTES.GROUPS.BY_ID(id));
  }

  async create(data: any): Promise<RegularGroup> {
    return this.client.post<RegularGroup>(API_ROUTES.GROUPS.LIST, data);
  }

  async update(id: string, data: any): Promise<RegularGroup> {
    return this.client.patch<RegularGroup>(API_ROUTES.GROUPS.BY_ID(id), data);
  }

  async delete(id: string): Promise<void> {
    return this.client.delete<void>(API_ROUTES.GROUPS.BY_ID(id));
  }

  async toggleActive(id: string): Promise<RegularGroup> {
    return this.client.post<RegularGroup>(`/groups/${id}/toggle-active`, {});
  }
}

export class GroupSessionsService {
  constructor(private client: ApiClient) {}

  async generateSessions(groupId: string, startDate: Date, endDate: Date): Promise<GroupSession[]> {
    return this.client.post<GroupSession[]>('/group-sessions/generate', {
      groupId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
  }

  async getUpcomingSessions(groupId: string): Promise<GroupSession[]> {
    return this.client.get<GroupSession[]>(`/group-sessions/group/${groupId}/upcoming`);
  }

  async getSessionById(id: string): Promise<GroupSession> {
    return this.client.get<GroupSession>(`/group-sessions/${id}`);
  }

  async getAllSessions(startDate?: Date, endDate?: Date): Promise<GroupSession[]> {
    const params: any = {};
    if (startDate) params.startDate = startDate.toISOString();
    if (endDate) params.endDate = endDate.toISOString();
    return this.client.get<GroupSession[]>('/group-sessions', { params });
  }

  async getSessionParticipants(id: string): Promise<any> {
    return this.client.get<any>(`/group-sessions/${id}/participants`);
  }

  async cancelSession(id: string, notes?: string): Promise<GroupSession> {
    return this.client.patch<GroupSession>(`/group-sessions/${id}/cancel`, { notes });
  }

  async deleteSession(id: string): Promise<void> {
    return this.client.delete<void>(`/group-sessions/${id}`);
  }
}

export class GroupEnrollmentsService {
  constructor(private client: ApiClient) {}

  async enroll(data: CreateEnrollmentDto): Promise<GroupEnrollment> {
    return this.client.post<GroupEnrollment>('/group-enrollments', data);
  }

  async getMyEnrollments(): Promise<GroupEnrollment[]> {
    return this.client.get<GroupEnrollment[]>('/group-enrollments/my');
  }

  async getEnrollmentById(id: string): Promise<GroupEnrollment> {
    return this.client.get<GroupEnrollment>(`/group-enrollments/${id}`);
  }

  async cancelEnrollment(id: string): Promise<GroupEnrollment> {
    return this.client.patch<GroupEnrollment>(`/group-enrollments/${id}/cancel`, {});
  }

  async pauseEnrollment(id: string): Promise<GroupEnrollment> {
    return this.client.patch<GroupEnrollment>(`/group-enrollments/${id}/pause`, {});
  }

  async resumeEnrollment(id: string): Promise<GroupEnrollment> {
    return this.client.patch<GroupEnrollment>(`/group-enrollments/${id}/resume`, {});
  }

  async checkEnrollment(groupId: string): Promise<{ isEnrolled: boolean }> {
    return this.client.get<{ isEnrolled: boolean }>(`/group-enrollments/check/${groupId}`);
  }

  async getActiveEnrollment(groupId: string): Promise<GroupEnrollment | null> {
    return this.client.get<GroupEnrollment | null>(`/group-enrollments/active/${groupId}`);
  }

  async getUpcomingSessions(enrollmentId: string): Promise<any[]> {
    return this.client.get<any[]>(`/group-enrollments/${enrollmentId}/upcoming-sessions`);
  }
}

export class ProductsService {
  constructor(private client: ApiClient) {}

  async getAll(): Promise<Product[]> {
    return this.client.get<Product[]>(API_ROUTES.PRODUCTS.LIST);
  }

  async getAvailable(): Promise<Product[]> {
    return this.client.get<Product[]>(API_ROUTES.PRODUCTS.AVAILABLE);
  }

  async getByCategory(category: string): Promise<Product[]> {
    return this.client.get<Product[]>(API_ROUTES.PRODUCTS.LIST, {
      params: { category },
    });
  }

  async getById(id: string): Promise<Product> {
    return this.client.get<Product>(API_ROUTES.PRODUCTS.BY_ID(id));
  }

  async getCategories(): Promise<string[]> {
    const products = await this.getAll();
    const categories = [...new Set(products.map(p => p.category))];
    return categories;
  }
}

export class OrdersService {
  constructor(private client: ApiClient) {}

  async create(data: any): Promise<Order> {
    return this.client.post<Order>(API_ROUTES.ORDERS.CREATE, data);
  }

  async getAll(): Promise<Order[]> {
    return this.client.get<Order[]>(API_ROUTES.ORDERS.LIST);
  }

  async getMyOrders(userId: string): Promise<Order[]> {
    return this.client.get<Order[]>(API_ROUTES.ORDERS.MY_ORDERS(userId));
  }

  async getById(id: string): Promise<Order> {
    return this.client.get<Order>(API_ROUTES.ORDERS.BY_ID(id));
  }

  async getQRCode(id: string): Promise<{ qrCode: string }> {
    return this.client.get<{ qrCode: string }>(API_ROUTES.ORDERS.QR_CODE(id));
  }
}

export class NewsService {
  constructor(private client: ApiClient) {}

  async getAll(): Promise<News[]> {
    return this.client.get<News[]>(API_ROUTES.NEWS.LIST);
  }

  async getPublished(): Promise<News[]> {
    return this.client.get<News[]>(API_ROUTES.NEWS.PUBLISHED);
  }

  async getById(id: string): Promise<News> {
    return this.client.get<News>(API_ROUTES.NEWS.BY_ID(id));
  }

  async create(data: any): Promise<News> {
    return this.client.post<News>(API_ROUTES.NEWS.LIST, data);
  }

  async update(id: string, data: any): Promise<News> {
    return this.client.patch<News>(API_ROUTES.NEWS.BY_ID(id), data);
  }

  async delete(id: string): Promise<void> {
    return this.client.delete<void>(API_ROUTES.NEWS.BY_ID(id));
  }

  async publish(id: string): Promise<News> {
    return this.client.post<News>(`/news/${id}/publish`);
  }

  async unpublish(id: string): Promise<News> {
    return this.client.post<News>(`/news/${id}/unpublish`);
  }
}

export class AuthService {
  constructor(private client: ApiClient) {}

  async login(email: string, password: string): Promise<{ accessToken: string; user: User }> {
    return this.client.post('/auth/login', { email, password });
  }

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    age?: number;
  }): Promise<{ accessToken: string; user: User }> {
    return this.client.post('/auth/register', data);
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    return this.client.get(`/auth/verify-email?token=${token}`);
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.client.post('/auth/forgot-password', { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return this.client.post('/auth/reset-password', { token, newPassword });
  }

  async getCurrentUser(): Promise<User> {
    return this.client.get('/auth/me');
  }
}

export class UsersService {
  constructor(private client: ApiClient) {}

  async getProfile(): Promise<User> {
    return this.client.get('/users/me');
  }

  async updateProfile(data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    avatarUrl?: string;
    age?: number;
  }): Promise<User> {
    return this.client.patch('/users/me', data);
  }

  async getSubscriptions(): Promise<Subscription[]> {
    return this.client.get('/users/me/subscriptions');
  }

  async getSubscriptionById(subscriptionId: string): Promise<Subscription> {
    return this.client.get(`/users/me/subscriptions/${subscriptionId}`);
  }

  async getActiveSubscription(): Promise<Subscription | null> {
    return this.client.get('/users/me/active-subscription');
  }

  async getBookingHistory(): Promise<Booking[]> {
    return this.client.get('/users/me/bookings');
  }

  async purchaseSubscription(typeId: string): Promise<SubscriptionPaymentInitResponse> {
    return this.client.post('/payments/subscriptions/init', { typeId });
  }

  // ADMIN METHODS
  async getAllUsers(page = 1, limit = 20, search?: string): Promise<{
    users: User[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const params: any = { page, limit };
    if (search) params.search = search;
    return this.client.get('/users/admin/all', { params });
  }

  async getUserById(userId: string): Promise<User> {
    return this.client.get(`/users/admin/${userId}`);
  }

  async addBalance(userId: string, amount: number): Promise<Subscription> {
    return this.client.post(`/users/admin/${userId}/add-balance`, { amount });
  }

  async deleteUser(userId: string): Promise<{ deleted: boolean }> {
    return this.client.delete(`/users/admin/${userId}`);
  }
}

export interface SubscriptionPaymentInitResponse {
  paymentUrl: string;
}

export class PaymentsService {
  constructor(private client: ApiClient) {}

  async initSubscriptionPayment(typeId: string): Promise<SubscriptionPaymentInitResponse> {
    return this.client.post('/payments/subscriptions/init', { typeId });
  }
}

export class SubscriptionTypesService {
  constructor(private client: ApiClient) {}

  async getAll(): Promise<SubscriptionType[]> {
    return this.client.get<SubscriptionType[]>('/subscription-types');
  }

  async getActive(): Promise<SubscriptionType[]> {
    return this.client.get<SubscriptionType[]>('/subscription-types/active');
  }

  async getById(id: string): Promise<SubscriptionType> {
    return this.client.get<SubscriptionType>(`/subscription-types/${id}`);
  }

  async create(data: {
    name: string;
    description?: string | null;
    amount: number;
    price: number;
    durationDays?: number | null;
    isActive?: boolean;
  }): Promise<SubscriptionType> {
    return this.client.post<SubscriptionType>('/subscription-types', data);
  }

  async update(
    id: string,
    data: {
      name?: string;
      description?: string | null;
      amount?: number;
      price?: number;
      durationDays?: number | null;
      isActive?: boolean;
    },
  ): Promise<SubscriptionType> {
    return this.client.patch<SubscriptionType>(`/subscription-types/${id}`, data);
  }

  async delete(id: string): Promise<void> {
    return this.client.delete<void>(`/subscription-types/${id}`);
  }

  async toggleActive(id: string): Promise<SubscriptionType> {
    return this.client.post<SubscriptionType>(`/subscription-types/${id}/toggle-active`, {});
  }
}

export class UploadService {
  constructor(private client: ApiClient) {}

  async uploadFile(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.client.baseURL}/uploads`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Upload error:', errorText);
      throw new Error(`Не удалось загрузить файл: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async deleteFile(id: string): Promise<void> {
    return this.client.delete(`/uploads/${id}`);
  }
}
