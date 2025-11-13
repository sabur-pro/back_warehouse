import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Delete, 
  Body, 
  UseGuards, 
  UseInterceptors,
  UploadedFile,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { CreateSubscriptionResponseDto, GetSubscriptionsResponseDto } from './dto/subscription-response.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RoleType, SubscriptionStatus } from '@prisma/client';

@ApiTags('subscription')
@Controller('subscription')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post()
  @Roles(RoleType.ADMIN)
  @ApiOperation({ summary: 'Create subscription (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Returns tokens', type: CreateSubscriptionResponseDto })
  @UseInterceptors(
    FileInterceptor('proof_photo', {
      storage: diskStorage({
        destination: './uploads/subscriptions',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  async createSubscription(
    @CurrentUser() user: any,
    @Body() createSubscriptionDto: CreateSubscriptionDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<CreateSubscriptionResponseDto> {
    return this.subscriptionService.createSubscription(
      user.adminId,
      createSubscriptionDto,
      file.path,
    );
  }

  @Get()
  @Roles(RoleType.ADMIN)
  @ApiOperation({ summary: 'Get own subscription (Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns subscription' })
  async getSubscription(@CurrentUser() user: any) {
    return this.subscriptionService.getSubscription(user.adminId);
  }

  @Put(':id')
  @Roles(RoleType.ADMIN)
  @ApiOperation({ summary: 'Update subscription (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Returns tokens', type: CreateSubscriptionResponseDto })
  @UseInterceptors(
    FileInterceptor('proof_photo', {
      storage: diskStorage({
        destination: './uploads/subscriptions',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async updateSubscription(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSubscriptionDto: Partial<CreateSubscriptionDto>,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<CreateSubscriptionResponseDto> {
    return this.subscriptionService.updateSubscription(
      user.adminId,
      id,
      updateSubscriptionDto,
      file?.path,
    );
  }

  @Delete(':id')
  @Roles(RoleType.ADMIN)
  @ApiOperation({ summary: 'Delete subscription (Admin only)' })
  @ApiResponse({ status: 200, description: 'Subscription deleted' })
  async deleteSubscription(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.subscriptionService.deleteSubscription(user.adminId, id);
    return { message: 'Subscription deleted successfully' };
  }

  @Get('all')
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all subscriptions (Super Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: SubscriptionStatus })
  @ApiResponse({ status: 200, description: 'Returns list of subscriptions', type: GetSubscriptionsResponseDto })
  async getAllSubscriptions(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: SubscriptionStatus,
  ): Promise<GetSubscriptionsResponseDto> {
    return this.subscriptionService.getAllSubscriptions(page, limit, status);
  }

  @Post(':id/confirm')
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Confirm subscription (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Subscription confirmed' })
  async confirmSubscription(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.subscriptionService.confirmSubscription(user.superAdminId, id);
    return { message: 'Subscription confirmed successfully' };
  }
}
