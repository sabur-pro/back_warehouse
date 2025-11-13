import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EmailService } from '@/common/services/email.service';
import * as bcrypt from 'bcrypt';
import { RoleType } from '@prisma/client';
import { SignInDto } from './dto/sign-in.dto';
import { VerifyDto } from './dto/verify.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async signIn(signInDto: SignInDto): Promise<AuthResponseDto> {
    const { gmail, login, phone, password } = signInDto;

    // Admin sign in
    if (gmail) {
      const admin = await this.prisma.admin.findUnique({ where: { gmail } });
      
      if (!admin) {
        // Register new admin
        return await this.registerAdmin(gmail, password);
      }

      // Check if admin is verified
      if (!admin.isVerified) {
        // If verification code expired (or missing), drop this account and register anew
        if (!admin.verificationExpiry || admin.verificationExpiry < new Date()) {
          await this.prisma.admin.delete({ where: { id: admin.id } });
          // Create new admin with fresh verification code and 10-minute expiry
          return await this.registerAdmin(gmail, password);
        }
        throw new BadRequestException('Please verify your email first');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, admin.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      return await this.generateTokens(admin.id, RoleType.ADMIN, { gmail: admin.gmail });
    }

    // Assistant sign in
    if (login) {
      const assistant = await this.prisma.assistant.findUnique({ where: { login } });
      
      if (!assistant) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(password, assistant.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      return await this.generateTokens(assistant.id, RoleType.ASSISTANT, { 
        login: assistant.login,
        adminId: assistant.adminId,
      });
    }

    // Super Admin sign in
    if (phone) {
      const superAdmin = await this.prisma.superAdmin.findUnique({ where: { phone } });
      
      if (!superAdmin) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(password, superAdmin.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      return await this.generateTokens(superAdmin.id, RoleType.SUPER_ADMIN, { phone: superAdmin.phone });
    }

    throw new BadRequestException('Please provide gmail, login or phone');
  }

  private async registerAdmin(gmail: string, password: string): Promise<AuthResponseDto> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = this.generateVerificationCode();
    const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.admin.create({
      data: {
        gmail,
        password: hashedPassword,
        verificationCode,
        verificationExpiry,
        isVerified: false,
      },
    });

    // Send verification email
    await this.emailService.sendVerificationCode(gmail, verificationCode);

    return {
      message: 'Verification code sent to your email',
    };
  }

  async verify(verifyDto: VerifyDto): Promise<AuthResponseDto> {
    const { gmail, code } = verifyDto;

    const admin = await this.prisma.admin.findUnique({ where: { gmail } });

    if (!admin) {
      throw new BadRequestException('Admin not found');
    }

    if (admin.isVerified) {
      throw new BadRequestException('Email already verified');
    }

    if (admin.verificationCode !== code) {
      throw new BadRequestException('Invalid verification code');
    }

    if (!admin.verificationExpiry || admin.verificationExpiry < new Date()) {
      // Expired: remove unverified admin completely; user must sign in again to start over
      await this.prisma.admin.delete({ where: { id: admin.id } });
      throw new BadRequestException('Verification code expired. Please sign in again to receive a new code');
    }

    await this.prisma.admin.update({
      where: { id: admin.id },
      data: {
        isVerified: true,
        verificationCode: null,
        verificationExpiry: null,
      },
    });

    return await this.generateTokens(admin.id, RoleType.ADMIN, { gmail: admin.gmail });
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const session = await this.prisma.session.findUnique({
        where: { refreshToken },
      });

      if (!session || session.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      let userId: number;
      let role: RoleType;
      let extraData = {};

      if (session.adminId) {
        const admin = await this.prisma.admin.findUnique({ where: { id: session.adminId } });
        userId = admin.id;
        role = RoleType.ADMIN;
        extraData = { gmail: admin.gmail };
      } else if (session.assistantId) {
        const assistant = await this.prisma.assistant.findUnique({ where: { id: session.assistantId } });
        userId = assistant.id;
        role = RoleType.ASSISTANT;
        extraData = { login: assistant.login, adminId: assistant.adminId };
      } else if (session.superAdminId) {
        const superAdmin = await this.prisma.superAdmin.findUnique({ where: { id: session.superAdminId } });
        userId = superAdmin.id;
        role = RoleType.SUPER_ADMIN;
        extraData = { phone: superAdmin.phone };
      }

      // Delete old session
      await this.prisma.session.delete({ where: { id: session.id } });

      return await this.generateTokens(userId, role, extraData);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async signOut(sessionId: string): Promise<void> {
    await this.prisma.session.delete({ where: { id: sessionId } });
  }

  private async generateTokens(
    userId: number,
    role: RoleType,
    extraData: any,
  ): Promise<AuthResponseDto> {
    const sessionId = this.generateSessionId();
    
    const payload: any = {
      session_id: sessionId,
      role,
      ...extraData,
    };

    if (role === RoleType.ADMIN) {
      payload.admin_id = userId;
    } else if (role === RoleType.ASSISTANT) {
      payload.user_id = userId;
    } else if (role === RoleType.SUPER_ADMIN) {
      payload.super_admin_id = userId;
    }

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
    });

    const refreshExpiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days
    const expiresAt = new Date(Date.now() + refreshExpiresIn);

    // Save session
    const sessionData: any = {
      id: sessionId,
      refreshToken,
      expiresAt,
    };

    if (role === RoleType.ADMIN) {
      sessionData.adminId = userId;
    } else if (role === RoleType.ASSISTANT) {
      sessionData.assistantId = userId;
    } else if (role === RoleType.SUPER_ADMIN) {
      sessionData.superAdminId = userId;
    }

    await this.prisma.session.create({ data: sessionData });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600, // 1 hour in seconds
    };
  }

  private generateVerificationCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
