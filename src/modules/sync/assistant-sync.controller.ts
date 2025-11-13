import { Controller, Post, Get, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { SyncService } from './sync.service';
import { PendingActionService } from './pending-action.service';
import { PushChangesDto } from './dto/push-changes.dto';
import { PullChangesDto } from './dto/pull-changes.dto';
import { RequestApprovalDto } from './dto/request-approval.dto';

@ApiTags('Sync - Assistant')
@Controller('sync/assistant')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AssistantSyncController {
  constructor(
    private syncService: SyncService,
    private pendingActionService: PendingActionService,
  ) {}

  @Post('push')
  @ApiOperation({ summary: 'Push изменений от ассистента на сервер' })
  async push(@Body() dto: PushChangesDto, @Req() req) {
    const assistantId = req.user.user_id;
    const adminId = req.user.adminId;
    return this.syncService.processPushFromAssistant(adminId, assistantId, dto);
  }

  @Post('request-approval')
  @ApiOperation({ summary: 'Запросить подтверждение действия у админа' })
  async requestApproval(@Body() dto: RequestApprovalDto, @Req() req) {
    const assistantId = req.user.user_id;
    const adminId = req.user.adminId;
    return this.pendingActionService.createPendingAction(adminId, assistantId, dto);
  }

  @Get('pull')
  @ApiOperation({ summary: 'Pull изменений с сервера для ассистента' })
  async pull(@Query() query: PullChangesDto, @Req() req) {
    const assistantId = req.user.user_id;
    return this.syncService.pullForAssistant(assistantId, query);
  }

  @Get('pending-status')
  @ApiOperation({ summary: 'Получить статус pending actions для ассистента' })
  async getPendingStatus(@Req() req) {
    const assistantId = req.user.user_id;
    return this.pendingActionService.getAssistantPendingActions(assistantId);
  }
}
