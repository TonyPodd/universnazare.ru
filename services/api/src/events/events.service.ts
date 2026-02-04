import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventStatus } from '@prisma/client';
import { parseKrasnoyarskDateTime } from '../utils/krasnoyarsk-time';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async create(createEventDto: CreateEventDto) {
    return this.prisma.event.create({
      data: {
        ...createEventDto,
        // Admin sends datetime-local without timezone; interpret as Krasnoyarsk time (+07:00).
        startDate: parseKrasnoyarskDateTime(createEventDto.startDate),
        endDate: parseKrasnoyarskDateTime(createEventDto.endDate),
        resultImages: createEventDto.resultImages || [],
        materials: createEventDto.materials || [],
      },
      include: {
        master: true,
      },
    });
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        skip,
        take: limit,
        include: {
          master: true,
        },
        orderBy: {
          startDate: 'asc',
        },
      }),
      this.prisma.event.count(),
    ]);

    return {
      data: events,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findUpcoming(limit = 5) {
    const now = new Date();

    return this.prisma.event.findMany({
      where: {
        startDate: {
          gte: now,
        },
        status: EventStatus.PUBLISHED,
      },
      take: limit,
      include: {
        master: true,
      },
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  async findCalendarEvents(startDate: Date, endDate: Date) {
    // Получаем события (мастер-классы)
    const events = await this.prisma.event.findMany({
      where: {
        AND: [
          {
            startDate: {
              gte: startDate,
            },
          },
          {
            endDate: {
              lte: endDate,
            },
          },
          {
            status: EventStatus.PUBLISHED,
          },
        ],
      },
      include: {
        master: true,
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    // Получаем групповые занятия
    const groupSessions = await this.prisma.groupSession.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          not: 'CANCELLED',
        },
      },
      include: {
        group: {
          include: {
            master: true,
          },
        },
        bookings: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Возвращаем оба типа событий
    return {
      events,
      groupSessions,
    };
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        master: true,
        bookings: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return event;
  }

  async update(id: string, updateEventDto: UpdateEventDto) {
    await this.findOne(id); // проверка существования

    const data: any = { ...updateEventDto };

    if (updateEventDto.startDate) {
      data.startDate = parseKrasnoyarskDateTime(updateEventDto.startDate);
    }

    if (updateEventDto.endDate) {
      data.endDate = parseKrasnoyarskDateTime(updateEventDto.endDate);
    }

    return this.prisma.event.update({
      where: { id },
      data,
      include: {
        master: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // проверка существования

    return this.prisma.event.delete({
      where: { id },
    });
  }

  async publish(id: string) {
    await this.findOne(id);

    return this.prisma.event.update({
      where: { id },
      data: {
        status: EventStatus.PUBLISHED,
      },
    });
  }

  async cancel(id: string) {
    await this.findOne(id);

    return this.prisma.event.update({
      where: { id },
      data: {
        status: EventStatus.CANCELLED,
      },
    });
  }
}
