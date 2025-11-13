import { Injectable, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class StorageService {
  private readonly uploadsDir = join(process.cwd(), 'uploads');

  constructor() {
    this.ensureUploadsDirExists();
  }

  private async ensureUploadsDirExists() {
    try {
      await fs.access(this.uploadsDir);
    } catch {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Создать папку для админа если не существует
   */
  private async ensureAdminDirExists(adminId: number) {
    const adminDir = join(this.uploadsDir, String(adminId));
    try {
      await fs.access(adminDir);
    } catch {
      await fs.mkdir(adminDir, { recursive: true });
    }
    return adminDir;
  }

  /**
   * Загрузить изображение
   */
  async uploadImage(
    adminId: number,
    file: Express.Multer.File,
  ): Promise<{ imageUrl: string }> {
    const adminDir = await this.ensureAdminDirExists(adminId);
    
    // Генерируем уникальное имя файла
    const timestamp = Date.now();
    const ext = file.originalname.split('.').pop();
    const filename = `item_${timestamp}.${ext}`;
    const filepath = join(adminDir, filename);

    // Перемещаем файл из временной папки в папку админа
    if (file.path) {
      // Файл уже сохранен на диск через diskStorage
      await fs.rename(file.path, filepath);
    } else if (file.buffer) {
      // Файл в памяти (fallback)
      await fs.writeFile(filepath, file.buffer);
    } else {
      throw new Error('File data not available');
    }

    // Возвращаем URL
    const imageUrl = `/storage/${adminId}/${filename}`;
    return { imageUrl };
  }

  /**
   * Получить изображение
   */
  async getImage(adminId: number, filename: string): Promise<Buffer> {
    const filepath = join(this.uploadsDir, String(adminId), filename);
    
    try {
      return await fs.readFile(filepath);
    } catch (error) {
      throw new NotFoundException('Image not found');
    }
  }

  /**
   * Удалить изображение
   */
  async deleteImage(adminId: number, filename: string): Promise<void> {
    const filepath = join(this.uploadsDir, String(adminId), filename);
    
    try {
      await fs.unlink(filepath);
    } catch (error) {
      // Игнорируем если файл уже удален
      console.warn(`Failed to delete image: ${filepath}`, error);
    }
  }

  /**
   * Проверить существует ли файл
   */
  async imageExists(adminId: number, filename: string): Promise<boolean> {
    const filepath = join(this.uploadsDir, String(adminId), filename);
    try {
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Получить путь к файлу для чтения через stream
   */
  getImagePath(adminId: number, filename: string): string {
    return join(this.uploadsDir, String(adminId), filename);
  }
}
