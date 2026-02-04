import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { parseKrasnoyarskDateTime } from '../utils/krasnoyarsk-time';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @ApiOperation({ summary: 'Создать новое событие' })
  @ApiResponse({ status: 201, description: 'Событие успешно создано' })
  create(@Body() createEventDto: CreateEventDto) {
    return this.eventsService.create(createEventDto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список всех событий' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.eventsService.findAll(page, limit);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Получить ближайшие события' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findUpcoming(@Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number) {
    return this.eventsService.findUpcoming(limit);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Получить события для календаря' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  findCalendarEvents(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.eventsService.findCalendarEvents(
      parseKrasnoyarskDateTime(startDate),
      parseKrasnoyarskDateTime(endDate),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить событие по ID' })
  @ApiResponse({ status: 200, description: 'Событие найдено' })
  @ApiResponse({ status: 404, description: 'Событие не найдено' })
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить событие' })
  @ApiResponse({ status: 200, description: 'Событие обновлено' })
  @ApiResponse({ status: 404, description: 'Событие не найдено' })
  update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
    return this.eventsService.update(id, updateEventDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить событие' })
  @ApiResponse({ status: 200, description: 'Событие удалено' })
  @ApiResponse({ status: 404, description: 'Событие не найдено' })
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Опубликовать событие' })
  publish(@Param('id') id: string) {
    return this.eventsService.publish(id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Отменить событие' })
  cancel(@Param('id') id: string) {
    return this.eventsService.cancel(id);
  }
}
