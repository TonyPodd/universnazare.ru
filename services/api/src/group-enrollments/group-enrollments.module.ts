import { Module } from '@nestjs/common';
import { GroupEnrollmentsController } from './group-enrollments.controller';
import { GroupEnrollmentsService } from './group-enrollments.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [GroupEnrollmentsController],
  providers: [GroupEnrollmentsService],
  exports: [GroupEnrollmentsService],
})
export class GroupEnrollmentsModule {}
