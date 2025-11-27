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

  // Create verified admin
  console.log('Creating verified admin...');
  const adminPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.admin.upsert({
    where: { gmail: 'admin@warehouse.tj' },
    update: {
      password: adminPassword,
      isVerified: true,
      verificationCode: null,
      verificationExpiry: null,
    },
    create: {
      gmail: 'admin@warehouse.tj',
      password: adminPassword,
      isVerified: true,
      verificationCode: null,
      verificationExpiry: null,
    },
  });
  console.log('✅ Admin created');
  console.log('📧 Email: admin@warehouse.tj');
  console.log('🔑 Password: admin123');

  // Create assistant linked to admin
  console.log('Creating assistant linked to admin...');
  const assistantPassword = await bcrypt.hash('assistant123', 10);

  await prisma.assistant.upsert({
    where: { login: 'assistant1' },
    update: {
      password: assistantPassword,
      phone: '+992900000001',
      adminId: admin.id,
    },
    create: {
      login: 'assistant1',
      password: assistantPassword,
      phone: '+992900000001',
      adminId: admin.id,
    },
  });
  console.log('✅ Assistant created and linked to admin');
  console.log('👤 Login: assistant1');
  console.log('📱 Phone: +992900000001');
  console.log('🔑 Password: assistant123');
  console.log(`🔗 Linked to admin ID: ${admin.id}`);

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
