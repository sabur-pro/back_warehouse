import { Injectable, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) { }

  async signIn(signInDto: SignInDto): Promise<AuthResponseDto> {
    const { gmail, login, phone, password } = signInDto;
    this.logger.log(`Sign-in attempt: ${gmail ? `gmail=${gmail}` : login ? `login=${login}` : phone ? `phone=${phone}` : 'unknown'}`);

    // Admin sign in
    if (gmail) {
      const admin = await this.prisma.admin.findUnique({ where: { gmail } });

      if (!admin) {
        this.logger.log(`Admin not found, registering new admin: ${gmail}`);
        // Register new admin
        return await this.registerAdmin(gmail, password);
      }

      // Check if admin is verified
      if (!admin.isVerified) {
        // If verification code expired (or missing), drop this account and register anew
        if (!admin.verificationExpiry || admin.verificationExpiry < new Date()) {
          this.logger.warn(`Verification code expired for admin: ${gmail}, deleting and re-registering`);
          await this.prisma.admin.delete({ where: { id: admin.id } });
          // Create new admin with fresh verification code and 10-minute expiry
          return await this.registerAdmin(gmail, password);
        }
        this.logger.warn(`Admin not verified yet: ${gmail}`);
        throw new BadRequestException('Please verify your email first');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, admin.password);
      if (!isPasswordValid) {
        this.logger.warn(`Invalid password for admin: ${gmail}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      this.logger.log(`Admin signed in successfully: ${gmail}`);
      return await this.generateTokens(admin.id, RoleType.ADMIN, { gmail: admin.gmail });
    }

    // Assistant sign in
    if (login) {
      const assistant = await this.prisma.assistant.findUnique({ where: { login } });

      if (!assistant) {
        this.logger.warn(`Assistant not found: ${login}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(password, assistant.password);
      if (!isPasswordValid) {
        this.logger.warn(`Invalid password for assistant: ${login}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      this.logger.log(`Assistant signed in successfully: ${login} (adminId: ${assistant.adminId})`);
      return await this.generateTokens(assistant.id, RoleType.ASSISTANT, {
        login: assistant.login,
        adminId: assistant.adminId,
      });
    }

    // Super Admin sign in
    if (phone) {
      const superAdmin = await this.prisma.superAdmin.findUnique({ where: { phone } });

      if (!superAdmin) {
        this.logger.warn(`Super admin not found: ${phone}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(password, superAdmin.password);
      if (!isPasswordValid) {
        this.logger.warn(`Invalid password for super admin: ${phone}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      this.logger.log(`Super admin signed in successfully: ${phone}`);
      return await this.generateTokens(superAdmin.id, RoleType.SUPER_ADMIN, { phone: superAdmin.phone });
    }

    this.logger.error('Sign-in attempt without gmail, login or phone');
    throw new BadRequestException('Please provide gmail, login or phone');
  }

  private async registerAdmin(gmail: string, password: string): Promise<AuthResponseDto> {
    this.logger.log(`Registering new admin: ${gmail}`);
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

    this.logger.log(`Admin created, sending verification code to: ${gmail} (expires in 10 minutes)`);
    // Send verification email
    await this.emailService.sendVerificationCode(gmail, verificationCode);

    this.logger.log(`Verification email sent successfully to: ${gmail}`);
    return {
      message: 'Verification code sent to your email',
    };
  }

  async verify(verifyDto: VerifyDto): Promise<AuthResponseDto> {
    const { gmail, code } = verifyDto;
    this.logger.log(`Verification attempt for: ${gmail}`);

    const admin = await this.prisma.admin.findUnique({ where: { gmail } });

    if (!admin) {
      this.logger.warn(`Verification failed - admin not found: ${gmail}`);
      throw new BadRequestException('Admin not found');
    }

    if (admin.isVerified) {
      this.logger.warn(`Verification failed - email already verified: ${gmail}`);
      throw new BadRequestException('Email already verified');
    }

    if (admin.verificationCode !== code) {
      this.logger.warn(`Verification failed - invalid code for: ${gmail}`);
      throw new BadRequestException('Invalid verification code');
    }

    if (!admin.verificationExpiry || admin.verificationExpiry < new Date()) {
      this.logger.warn(`Verification failed - code expired for: ${gmail}, deleting admin record`);
      // Expired: remove unverified admin completely; user must sign in again to start over
      await this.prisma.admin.delete({ where: { id: admin.id } });
      throw new BadRequestException('Verification code expired. Please sign in again to receive a new code');
    }

    this.logger.log(`Email verified successfully for: ${gmail}`);
    await this.prisma.admin.update({
      where: { id: admin.id },
      data: {
        isVerified: true,
        verificationCode: null,
        verificationExpiry: null,
      },
    });

    this.logger.log(`Generating tokens for verified admin: ${gmail}`);
    return await this.generateTokens(admin.id, RoleType.ADMIN, { gmail: admin.gmail });
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    this.logger.log('Token refresh attempt');
    try {
      const session = await this.prisma.session.findUnique({
        where: { refreshToken },
      });

      if (!session) {
        this.logger.warn('Token refresh failed - session not found');
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (session.expiresAt < new Date()) {
        this.logger.warn(`Token refresh failed - session expired (sessionId: ${session.id})`);
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
        this.logger.log(`Refreshing token for admin: ${admin.gmail} (sessionId: ${session.id})`);
      } else if (session.assistantId) {
        const assistant = await this.prisma.assistant.findUnique({ where: { id: session.assistantId } });
        userId = assistant.id;
        role = RoleType.ASSISTANT;
        extraData = { login: assistant.login, adminId: assistant.adminId };
        this.logger.log(`Refreshing token for assistant: ${assistant.login} (sessionId: ${session.id})`);
      } else if (session.superAdminId) {
        const superAdmin = await this.prisma.superAdmin.findUnique({ where: { id: session.superAdminId } });
        userId = superAdmin.id;
        role = RoleType.SUPER_ADMIN;
        extraData = { phone: superAdmin.phone };
        this.logger.log(`Refreshing token for super admin: ${superAdmin.phone} (sessionId: ${session.id})`);
      }

      // Delete old session
      await this.prisma.session.delete({ where: { id: session.id } });
      this.logger.log(`Old session deleted, generating new tokens (sessionId: ${session.id})`);

      return await this.generateTokens(userId, role, extraData);
    } catch (error) {
      this.logger.error(`Token refresh error: ${error.message}`, error.stack);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async signOut(sessionId: string): Promise<void> {
    this.logger.log(`Sign-out: deleting session ${sessionId}`);
    await this.prisma.session.delete({ where: { id: sessionId } });
    this.logger.log(`Session deleted successfully: ${sessionId}`);
  }

  private async generateTokens(
    userId: number,
    role: RoleType,
    extraData: any,
  ): Promise<AuthResponseDto> {
    const sessionId = this.generateSessionId();
    this.logger.log(`Generating tokens for userId: ${userId}, role: ${role}, sessionId: ${sessionId}`);

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
