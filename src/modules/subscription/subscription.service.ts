import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RoleType, SubscriptionStatus } from '@prisma/client';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { CreateSubscriptionResponseDto, GetSubscriptionsResponseDto } from './dto/subscription-response.dto';

@Injectable()
export class SubscriptionService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async createSubscription(
    adminId: number,
    createSubscriptionDto: CreateSubscriptionDto,
    proofPhotoPath: string,
  ): Promise<CreateSubscriptionResponseDto> {
    // Check if admin has a pending subscription
    const pendingSubscription = await this.prisma.subscription.findFirst({
      where: {
        adminId,
        status: SubscriptionStatus.PENDING,
      },
    });

    if (pendingSubscription) {
      throw new BadRequestException('You already have a pending subscription');
    }

    // Create subscription
    const subscription = await this.prisma.subscription.create({
      data: {
        adminId,
        startDate: new Date(),
        endDate: new Date(createSubscriptionDto.end_date),
        price: createSubscriptionDto.price,
        proofPhoto: proofPhotoPath,
        status: SubscriptionStatus.PENDING,
      },
    });

    // Get admin and generate new tokens
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
    });

    const sessionId = this.generateSessionId();
    const payload = {
      session_id: sessionId,
      admin_id: admin.id,
      gmail: admin.gmail,
      role: RoleType.ADMIN,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
    });

    const refreshExpiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days
    const expiresAt = new Date(Date.now() + refreshExpiresIn);

    // Save session
    await this.prisma.session.create({
      data: {
        id: sessionId,
        adminId: admin.id,
        refreshToken,
        expiresAt,
      },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600,
    };
  }

  async getSubscription(adminId: number) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { adminId },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return {
      id: subscription.id,
      admin_id: subscription.adminId,
      start_date: subscription.startDate,
      end_date: subscription.endDate,
      status: subscription.status,
      price: subscription.price,
      proof_photo: subscription.proofPhoto,
      created_at: subscription.createdAt,
      updated_at: subscription.updatedAt,
    };
  }

  async updateSubscription(
    adminId: number,
    subscriptionId: number,
    updateData: Partial<CreateSubscriptionDto>,
    proofPhotoPath?: string,
  ): Promise<CreateSubscriptionResponseDto> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        adminId,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status !== SubscriptionStatus.PENDING) {
      throw new BadRequestException('Can only update pending subscriptions');
    }

    const updatePayload: any = {};

    if (updateData.price) updatePayload.price = updateData.price;
    if (updateData.end_date) updatePayload.endDate = new Date(updateData.end_date);
    if (proofPhotoPath) updatePayload.proofPhoto = proofPhotoPath;

    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: updatePayload,
    });

    // Get admin and generate new tokens
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
    });

    const sessionId = this.generateSessionId();
    const payload = {
      session_id: sessionId,
      admin_id: admin.id,
      gmail: admin.gmail,
      role: RoleType.ADMIN,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
    });

    const refreshExpiresIn = 7 * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + refreshExpiresIn);

    await this.prisma.session.create({
      data: {
        id: sessionId,
        adminId: admin.id,
        refreshToken,
        expiresAt,
      },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600,
    };
  }

  async deleteSubscription(adminId: number, subscriptionId: number): Promise<void> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        adminId,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status !== SubscriptionStatus.PENDING) {
      throw new BadRequestException('Can only delete pending subscriptions');
    }

    await this.prisma.subscription.delete({
      where: { id: subscriptionId },
    });
  }

  async getAllSubscriptions(
    page?: number,
    limit?: number,
    status?: SubscriptionStatus,
  ): Promise<GetSubscriptionsResponseDto> {
    const pageNum = Number(page) > 0 ? Number(page) : 1;
    const limitNum = Number(limit) > 0 ? Number(limit) : 10;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status;

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      data: subscriptions.map((sub) => ({
        id: sub.id,
        admin_id: sub.adminId,
        start_date: sub.startDate,
        end_date: sub.endDate,
        status: sub.status,
        price: sub.price,
        proof_photo: sub.proofPhoto,
        created_at: sub.createdAt,
        updated_at: sub.updatedAt,
      })),
      page: pageNum,
      limit: limitNum,
      total,
    };
  }

  async confirmSubscription(superAdminId: number, subscriptionId: number): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        admin: {
          include: {
            assistant: true,
          },
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status !== SubscriptionStatus.PENDING) {
      throw new BadRequestException('Can only confirm pending subscriptions');
    }

    // Update subscription status
    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: SubscriptionStatus.ACTIVE },
    });

    // Subscription is now applied to both admin and assistant (handled by business logic)
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
