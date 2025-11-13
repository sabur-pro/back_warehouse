import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RoleType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateAssistantDto } from './dto/create-assistant.dto';
import { CreateAssistantResponseDto, GetAssistantsResponseDto } from './dto/assistant-response.dto';

@Injectable()
export class AssistantService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async createAssistant(
    adminId: number,
    createAssistantDto: CreateAssistantDto,
  ): Promise<CreateAssistantResponseDto> {
    // Check if admin already has an assistant
    const existingAssistant = await this.prisma.assistant.findFirst({
      where: { adminId: adminId },
    });

    if (existingAssistant) {
      throw new BadRequestException('You can only create one assistant');
    }

    // Check if login is already taken
    const loginExists = await this.prisma.assistant.findUnique({
      where: { login: createAssistantDto.login },
    });

    if (loginExists) {
      throw new BadRequestException('Login already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createAssistantDto.password, 10);

    // Create assistant
    const assistant = await this.prisma.assistant.create({
      data: {
        adminId: adminId,
        login: createAssistantDto.login,
        password: hashedPassword,
        phone: createAssistantDto.phone,
      },
    });

    // Generate tokens
    const sessionId = this.generateSessionId();
    const payload = {
      session_id: sessionId,
      user_id: assistant.id,
      adminId: assistant.adminId,
      login: assistant.login,
      role: RoleType.ASSISTANT,
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
        assistantId: assistant.id,
        refreshToken,
        expiresAt,
      },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600, // 1 hour in seconds
    };
  }

  async getAssistants(
    userId: number,
    role: RoleType,
    page: number = 1,
    limit: number = 10,
    login?: string,
    phone?: string,
  ): Promise<GetAssistantsResponseDto> {
    const skip = (page - 1) * limit;

    let where: any = {};

    if (role === RoleType.ADMIN) {
      // Admin can only see their own assistant
      where.adminId = userId;
    } else if (role === RoleType.SUPER_ADMIN) {
      // Super admin can see all assistants
      where = {};
    } else {
      throw new ForbiddenException('Only admins and super admins can view assistants');
    }

    if (login) {
      where.login = { contains: login, mode: 'insensitive' };
    }

    if (phone) {
      where.phone = { contains: phone };
    }

    const [assistants, total] = await Promise.all([
      this.prisma.assistant.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          adminId: true,
          login: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.assistant.count({ where }),
    ]);

    return {
      data: assistants.map((assistant) => ({
        id: assistant.id,
        boss_id: assistant.adminId,
        login: assistant.login,
        phone: assistant.phone,
        created_at: assistant.createdAt,
        updated_at: assistant.updatedAt,
      })),
      page,
      limit,
      total,
    };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
