import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  BadRequestException,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { OptionalJwtAuthGuard } from '../auth/optional-auth.guard';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  private normalizeStatus(status?: string) {
    const allowed = new Set(['PENDING', 'CONFIRMED', 'CANCELLED', 'ATTENDED']);
    if (!status) return undefined;
    if (!allowed.has(status)) return undefined;
    return status as 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'ATTENDED';
  }

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Request() req,
    @Body()
    createBookingDto: {
      eventId?: string;
      groupSessionId?: string;
      participants: Array<{ fullName: string; phone: string; age?: number }>;
      contactEmail: string;
      paymentMethod: 'SUBSCRIPTION' | 'ON_SITE';
      notes?: string;
      subscriptionId?: string;
    },
  ) {
    // Проверяем авторизацию для оплаты через абонемент
    if (createBookingDto.paymentMethod === 'SUBSCRIPTION' && !req.user) {
      throw new BadRequestException('Для оплаты через абонемент необходимо войти в систему');
    }

    return this.bookingsService.create({
      ...createBookingDto,
      userId: req.user?.id,
    });
  }

  @Get()
  findAll() {
    return this.bookingsService.findAll();
  }

  @Get('paginated')
  findPaginated(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('eventOnly') eventOnly?: string,
  ) {
    const onlyEvents = eventOnly === 'true' || eventOnly === '1';
    return this.bookingsService.findPaginated({
      page,
      limit,
      status: this.normalizeStatus(status && status !== 'all' ? status : undefined),
      eventOnly: onlyEvents,
    });
  }

  @Get('event/:eventId')
  findByEvent(@Param('eventId') eventId: string) {
    return this.bookingsService.findByEvent(eventId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'ATTENDED',
  ) {
    return this.bookingsService.updateStatus(id, status);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id') id: string) {
    return this.bookingsService.cancel(id);
  }

  @Get('my/upcoming')
  @UseGuards(OptionalJwtAuthGuard)
  getMyUpcomingBookings(@Request() req) {
    if (!req.user) {
      return [];
    }
    return this.bookingsService.getUpcomingUserBookings(req.user.id);
  }
}
