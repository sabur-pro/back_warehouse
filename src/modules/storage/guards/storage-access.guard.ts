import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class StorageAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const requestedAdminId = parseInt(request.params.adminId, 10);

    // Админ может получить доступ к своим файлам
    if (user.role === 'ADMIN' && user.admin_id === requestedAdminId) {
      return true;
    }

    // Ассистент может получить доступ к файлам своего админа
    if (user.role === 'ASSISTANT' && user.adminId === requestedAdminId) {
      return true;
    }

    throw new ForbiddenException('Access denied to this storage');
  }
}
