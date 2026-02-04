import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionTypeDto } from './dto/create-subscription-type.dto';
import { UpdateSubscriptionTypeDto } from './dto/update-subscription-type.dto';

@Injectable()
export class SubscriptionTypesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSubscriptionTypeDto) {
    return this.prisma.subscriptionType.create({
      data: dto,
    });
  }

  async findAll() {
    return this.prisma.subscriptionType.findMany({
      orderBy: { price: 'asc' },
    });
  }

  async findActive() {
    return this.prisma.subscriptionType.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
  }

  async findOne(id: string) {
    const type = await this.prisma.subscriptionType.findUnique({
      where: { id },
    });

    if (!type) {
      throw new NotFoundException('Тип абонемента не найден');
    }

    return type;
  }

  async update(id: string, dto: UpdateSubscriptionTypeDto) {
    try {
      return await this.prisma.subscriptionType.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      throw new NotFoundException('Тип абонемента не найден');
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.subscriptionType.delete({
        where: { id },
      });
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2003') {
        try {
          return await this.prisma.subscriptionType.update({
            where: { id },
            data: { isActive: false },
          });
        } catch {
          throw new NotFoundException('Тип абонемента не найден');
        }
      }
      throw new NotFoundException('Тип абонемента не найден');
    }
  }

  async toggleActive(id: string) {
    const type = await this.findOne(id);
    return this.prisma.subscriptionType.update({
      where: { id },
      data: { isActive: !type.isActive },
    });
  }
}
