import { Controller, Post, Body, Req, UseGuards, Delete, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { RegisterTokenDto } from './dto/register-token.dto';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Post('register-token')
  @ApiOperation({ summary: 'Зарегистрировать push token для уведомлений' })
  async registerToken(@Body() dto: RegisterTokenDto, @Req() req) {
    const userId = req.user.role === 'ADMIN' ? req.user.admin_id : req.user.user_id;
    const userType = req.user.role;

    return this.notificationsService.registerPushToken(
      userId,
      userType,
      dto.token,
      dto.deviceInfo,
    );
  }

  @Delete('deactivate-token/:token')
  @ApiOperation({ summary: 'Деактивировать push token' })
  async deactivateToken(@Param('token') token: string) {
    return this.notificationsService.deactivateToken(token);
  }
}
