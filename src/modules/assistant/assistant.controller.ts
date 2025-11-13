import { Controller, Post, Get, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AssistantService } from './assistant.service';
import { CreateAssistantDto } from './dto/create-assistant.dto';
import { CreateAssistantResponseDto, GetAssistantsResponseDto } from './dto/assistant-response.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('assistant')
@Controller('assistant')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post()
  @Roles(RoleType.ADMIN)
  @ApiOperation({ summary: 'Create assistant (Admin only)' })
  @ApiResponse({ status: 201, description: 'Returns tokens', type: CreateAssistantResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createAssistant(
    @CurrentUser() user: any,
    @Body() createAssistantDto: CreateAssistantDto,
  ): Promise<CreateAssistantResponseDto> {
    return this.assistantService.createAssistant(user.adminId, createAssistantDto);
  }

  @Get()
  @Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get assistants' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'login', required: false, type: String })
  @ApiQuery({ name: 'phone', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Returns list of assistants', type: GetAssistantsResponseDto })
  async getAssistants(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('login') login?: string,
    @Query('phone') phone?: string,
  ): Promise<GetAssistantsResponseDto> {
    const userId = user.role === RoleType.ADMIN ? user.adminId : user.superAdminId;
    return this.assistantService.getAssistants(userId, user.role, page, limit, login, phone);
  }
}
