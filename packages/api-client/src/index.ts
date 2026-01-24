import { ApiClient, ApiClientConfig } from './client';
import {
  EventsService,
  BookingsService,
  MastersService,
  GroupsService,
  GroupSessionsService,
  GroupEnrollmentsService,
  ProductsService,
  OrdersService,
  NewsService,
  AuthService,
  UsersService,
  SubscriptionTypesService,
  UploadService,
  PaymentsService,
} from './services';

export * from './client';
export * from './services';

export class MssApiClient {
  public events: EventsService;
  public bookings: BookingsService;
  public masters: MastersService;
  public groups: GroupsService;
  public groupSessions: GroupSessionsService;
  public groupEnrollments: GroupEnrollmentsService;
  public products: ProductsService;
  public orders: OrdersService;
  public news: NewsService;
  public auth: AuthService;
  public users: UsersService;
  public subscriptionTypes: SubscriptionTypesService;
  public upload: UploadService;
  public payments: PaymentsService;

  private client: ApiClient;

  constructor(config: ApiClientConfig) {
    this.client = new ApiClient(config);

    // Инициализация всех сервисов
    this.events = new EventsService(this.client);
    this.bookings = new BookingsService(this.client);
    this.masters = new MastersService(this.client);
    this.groups = new GroupsService(this.client);
    this.groupSessions = new GroupSessionsService(this.client);
    this.groupEnrollments = new GroupEnrollmentsService(this.client);
    this.products = new ProductsService(this.client);
    this.orders = new OrdersService(this.client);
    this.news = new NewsService(this.client);
    this.auth = new AuthService(this.client);
    this.users = new UsersService(this.client);
    this.subscriptionTypes = new SubscriptionTypesService(this.client);
    this.upload = new UploadService(this.client);
    this.payments = new PaymentsService(this.client);
  }

  setToken(token: string) {
    this.client.setToken(token);
  }

  clearToken() {
    this.client.clearToken();
  }
}

// Дефолтный экспорт для удобства
export default MssApiClient;
