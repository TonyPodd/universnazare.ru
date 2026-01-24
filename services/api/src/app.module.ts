import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { EventsModule } from './events/events.module';
import { MastersModule } from './masters/masters.module';
import { NewsModule } from './news/news.module';
import { UploadModule } from './upload/upload.module';
import { BookingsModule } from './bookings/bookings.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GroupsModule } from './groups/groups.module';
import { GroupSessionsModule } from './group-sessions/group-sessions.module';
import { SubscriptionTypesModule } from './subscription-types/subscription-types.module';
import { GroupEnrollmentsModule } from './group-enrollments/group-enrollments.module';
import { TasksModule } from './tasks/tasks.module';
import { EmailModule } from './email/email.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    EmailModule,
    EventsModule,
    MastersModule,
    NewsModule,
    UploadModule,
    BookingsModule,
    AuthModule,
    UsersModule,
    GroupsModule,
    GroupSessionsModule,
    SubscriptionTypesModule,
    GroupEnrollmentsModule,
    TasksModule,
    ProductsModule,
    OrdersModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
