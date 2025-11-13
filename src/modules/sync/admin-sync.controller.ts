import { Controller, Get, Post, Param, Body, Query, Req, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { SyncService } from './sync.service';
import { PendingActionService } from './pending-action.service';
import { PullChangesDto } from './dto/pull-changes.dto';
import { ApproveActionDto, RejectActionDto } from './dto/request-approval.dto';

@ApiTags('Sync - Admin')
@Controller('sync/admin')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AdminSyncController {
  constructor(
    private syncService: SyncService,
    private pendingActionService: PendingActionService,
  ) {}

  @Get('pull')
  @ApiOperation({ summary: 'Pull изменений с сервера для админа' })
  async pull(@Query() query: PullChangesDto, @Req() req) {
    const adminId = req.user.admin_id;
    return this.syncService.pullForAdmin(adminId, query);
  }

  @Get('pending-actions')
  @ApiOperation({ summary: 'Получить список pending actions для админа' })
  async getPendingActions(@Req() req) {
    const adminId = req.user.admin_id;
    return this.pendingActionService.getAdminPendingActions(adminId);
  }

  @Post('approve/:id')
  @ApiOperation({ summary: 'Одобрить pending action' })
  @ApiParam({ name: 'id', type: 'number' })
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveActionDto,
    @Req() req,
  ) {
    const adminId = req.user.admin_id;
    return this.pendingActionService.approvePendingAction(adminId, id, dto.comment);
  }

  @Post('reject/:id')
  @ApiOperation({ summary: 'Отклонить pending action' })
  @ApiParam({ name: 'id', type: 'number' })
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectActionDto,
    @Req() req,
  ) {
    const adminId = req.user.admin_id;
    return this.pendingActionService.rejectPendingAction(adminId, id, dto.comment);
  }
}
