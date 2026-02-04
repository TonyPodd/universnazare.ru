import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    return this.prisma.product.create({
      data: createProductDto,
    });
  }

  async findAll() {
    return this.prisma.product.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        master: true,
      },
    });
  }

  async findAvailable() {
    return this.prisma.product.findMany({
      where: {
        isAvailable: true,
        stockQuantity: {
          gt: 0,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        master: true,
      },
    });
  }

  async findByCategory(category: string) {
    return this.prisma.product.findMany({
      where: {
        category,
        isAvailable: true,
        stockQuantity: {
          gt: 0,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        master: true,
      },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        master: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    await this.findOne(id); // проверка существования

    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // проверка существования

    try {
      return await this.prisma.product.delete({
        where: { id },
      });
    } catch (error) {
      // If product is referenced by order items, archive it instead of deleting.
      if ((error as { code?: string })?.code === 'P2003') {
        return this.prisma.product.update({
          where: { id },
          data: { isAvailable: false, stockQuantity: 0 },
        });
      }
      throw error;
    }
  }

  async decreaseStock(id: string, quantity: number) {
    const product = await this.findOne(id);

    if (product.stockQuantity < quantity) {
      throw new Error(`Insufficient stock for product ${id}`);
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        stockQuantity: {
          decrement: quantity,
        },
      },
    });
  }

  async increaseStock(id: string, quantity: number) {
    return this.prisma.product.update({
      where: { id },
      data: {
        stockQuantity: {
          increment: quantity,
        },
      },
    });
  }
}
