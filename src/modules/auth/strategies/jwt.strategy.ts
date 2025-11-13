import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return {
      sessionId: payload.session_id,
      admin_id: payload.admin_id,
      user_id: payload.user_id,
      adminId: payload.adminId,
      superAdminId: payload.super_admin_id,
      gmail: payload.gmail,
      login: payload.login,
      phone: payload.phone,
      role: payload.role,
    };
  }
}
