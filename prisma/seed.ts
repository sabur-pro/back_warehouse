import { PrismaClient, RoleType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create roles
  console.log('Creating roles...');
  const roles = [RoleType.ADMIN, RoleType.ASSISTANT, RoleType.SUPER_ADMIN];
  
  for (const roleName of roles) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
  }
  console.log('✅ Roles created');

  // Create super admin
  console.log('Creating super admin...');
  const hashedPassword = await bcrypt.hash('super_admin_password', 10);
  
  await prisma.superAdmin.upsert({
    where: { phone: '+992000000000' },
    update: {
      password: hashedPassword,
    },
    create: {
      phone: '+992000000000',
      password: hashedPassword,
    },
  });
  console.log('✅ Super admin created');
  console.log('📱 Phone: +992000000000');
  console.log('🔑 Password: super_admin_password');

  console.log('🎉 Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
