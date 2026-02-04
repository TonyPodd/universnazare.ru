import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMasterDto } from './dto/create-master.dto';
import { UpdateMasterDto } from './dto/update-master.dto';

@Injectable()
export class MastersService {
  constructor(private prisma: PrismaService) {}

  async create(createMasterDto: CreateMasterDto) {
    return this.prisma.master.create({
      data: createMasterDto,
    });
  }

  async findAll() {
    return this.prisma.master.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findActive() {
    return this.prisma.master.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const master = await this.prisma.master.findUnique({
      where: { id },
      include: {
        events: {
          orderBy: {
            startDate: 'desc',
          },
          take: 10,
        },
        regularGroups: true,
        products: {
          where: {
            isAvailable: true,
          },
          take: 10,
        },
      },
    });

    if (!master) {
      throw new NotFoundException(`Master with ID ${id} not found`);
    }

    return master;
  }

  async update(id: string, updateMasterDto: UpdateMasterDto) {
    await this.findOne(id); // проверка существования

    return this.prisma.master.update({
      where: { id },
      data: updateMasterDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // проверка существования

    try {
      return await this.prisma.master.delete({
        where: { id },
      });
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2003') {
        return this.prisma.master.update({
          where: { id },
          data: { isActive: false },
        });
      }
      throw error;
    }
  }
}
