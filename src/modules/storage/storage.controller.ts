import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  Req,
  Res,
  UseGuards,
  ParseIntPipe,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { StorageService } from './storage.service';
import { StorageAccessGuard } from './guards/storage-access.guard';

@ApiTags('Storage')
@Controller('storage')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class StorageController {
  constructor(private storageService: StorageService) {}

  /**
   * Загрузить изображение
   * POST /storage/upload
   */
  @Post('upload')
  @ApiOperation({ summary: 'Загрузить изображение товара' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        // Временная папка, StorageService переместит в правильное место
        cb(null, 'uploads/temp');
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = file.originalname.split('.').pop();
        cb(null, `temp-${uniqueSuffix}.${ext}`);
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
    fileFilter: (req, file, cb) => {
      // Только изображения
      if (!file.mimetype.match(/^image\/(jpeg|png|jpg|gif|webp)$/)) {
        cb(new BadRequestException('Only image files are allowed'), false);
      } else {
        cb(null, true);
      }
    },
  }))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Получаем adminId из токена
    const adminId = req.user.role === 'ADMIN' 
      ? req.user.admin_id 
      : req.user.adminId;

    return this.storageService.uploadImage(adminId, file);
  }

  /**
   * Получить изображение
   * GET /storage/:adminId/:filename
   */
  @Get(':adminId/:filename')
  @ApiOperation({ summary: 'Получить изображение товара' })
  @ApiParam({ name: 'adminId', type: 'number' })
  @ApiParam({ name: 'filename', type: 'string' })
  @UseGuards(StorageAccessGuard)
  async getImage(
    @Param('adminId', ParseIntPipe) adminId: number,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const exists = await this.storageService.imageExists(adminId, filename);
    if (!exists) {
      throw new NotFoundException('Image not found');
    }

    // Отдаем файл через sendFile для лучшей производительности
    const filepath = this.storageService.getImagePath(adminId, filename);
    res.sendFile(filepath);
  }

  /**
   * Удалить изображение
   * DELETE /storage/:adminId/:filename
   */
  @Delete(':adminId/:filename')
  @ApiOperation({ summary: 'Удалить изображение товара' })
  @ApiParam({ name: 'adminId', type: 'number' })
  @ApiParam({ name: 'filename', type: 'string' })
  @UseGuards(StorageAccessGuard)
  async deleteImage(
    @Param('adminId', ParseIntPipe) adminId: number,
    @Param('filename') filename: string,
  ) {
    await this.storageService.deleteImage(adminId, filename);
    return { success: true };
  }
}
