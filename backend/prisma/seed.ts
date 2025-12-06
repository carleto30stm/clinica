/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data
  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.user.deleteMany();

  console.log('🗑️  Cleared existing data');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@clinica.com',
      passwordHash: adminPassword,
      name: 'Administrador Principal',
      role: 'ADMIN',
      phone: '+34 600 000 000',
    },
  });
  console.log('👤 Created admin user:', admin.email);

  // Create doctor users
  const doctorPassword = await bcrypt.hash('doctor123', 10);
  const doctors = await Promise.all([
    prisma.user.create({
      data: {
        email: 'dr.garcia@clinica.com',
        passwordHash: doctorPassword,
        name: 'Dr. Carlos García',
        role: 'DOCTOR',
        specialty: 'Medicina General',
        phone: '+34 600 111 111',
      },
    }),
    prisma.user.create({
      data: {
        email: 'dra.martinez@clinica.com',
        passwordHash: doctorPassword,
        name: 'Dra. María Martínez',
        role: 'DOCTOR',
        specialty: 'Pediatría',
        phone: '+34 600 222 222',
      },
    }),
    prisma.user.create({
      data: {
        email: 'dr.lopez@clinica.com',
        passwordHash: doctorPassword,
        name: 'Dr. Juan López',
        role: 'DOCTOR',
        specialty: 'Cardiología',
        phone: '+34 600 333 333',
      },
    }),
    prisma.user.create({
      data: {
        email: 'dra.fernandez@clinica.com',
        passwordHash: doctorPassword,
        name: 'Dra. Ana Fernández',
        role: 'DOCTOR',
        specialty: 'Neurología',
        phone: '+34 600 444 444',
      },
    }),
    prisma.user.create({
      data: {
        email: 'dr.sanchez@clinica.com',
        passwordHash: doctorPassword,
        name: 'Dr. Pedro Sánchez',
        role: 'DOCTOR',
        specialty: 'Traumatología',
        phone: '+34 600 555 555',
      },
    }),
  ]);
  console.log(`👨‍⚕️ Created ${doctors.length} doctor users`);

  // Create shifts for the current month
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Get last day of current month
  const lastDay = new Date(currentYear, currentMonth + 1, 0);

  interface ShiftData {
    startDateTime: Date;
    endDateTime: Date;
    type: 'FIXED' | 'ROTATING';
    isAvailable: boolean;
    doctorId: string | null;
    createdByAdminId: string;
    notes: string | null;
  }

  const shifts: ShiftData[] = [];

  // Create shifts for each day of the month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(currentYear, currentMonth, day);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    // Morning shift (8:00 - 14:00)
    shifts.push({
      startDateTime: new Date(currentYear, currentMonth, day, 8, 0),
      endDateTime: new Date(currentYear, currentMonth, day, 14, 0),
      type: 'FIXED',
      isAvailable: false,
      doctorId: doctors[day % doctors.length].id,
      createdByAdminId: admin.id,
      notes: isWeekend ? 'Turno de fin de semana' : null,
    });

    // Afternoon shift (14:00 - 20:00)
    shifts.push({
      startDateTime: new Date(currentYear, currentMonth, day, 14, 0),
      endDateTime: new Date(currentYear, currentMonth, day, 20, 0),
      type: 'FIXED',
      isAvailable: false,
      doctorId: doctors[(day + 1) % doctors.length].id,
      createdByAdminId: admin.id,
      notes: isWeekend ? 'Turno de fin de semana' : null,
    });

    // Night shift (20:00 - 8:00 next day)
    shifts.push({
      startDateTime: new Date(currentYear, currentMonth, day, 20, 0),
      endDateTime: new Date(currentYear, currentMonth, day + 1, 8, 0),
      type: 'ROTATING',
      isAvailable: day % 3 === 0, // Some shifts available for self-assignment
      doctorId: day % 3 === 0 ? null : doctors[(day + 2) % doctors.length].id,
      createdByAdminId: admin.id,
      notes: 'Guardia nocturna',
    });
  }

  // Add some extra rotating/available shifts
  for (let i = 0; i < 10; i++) {
    const randomDay = Math.floor(Math.random() * lastDay.getDate()) + 1;
    const randomHour = Math.floor(Math.random() * 12) + 8;

    shifts.push({
      startDateTime: new Date(currentYear, currentMonth, randomDay, randomHour, 0),
      endDateTime: new Date(currentYear, currentMonth, randomDay, randomHour + 4, 0),
      type: 'ROTATING',
      isAvailable: true,
      doctorId: null,
      createdByAdminId: admin.id,
      notes: 'Turno adicional disponible',
    });
  }

  await prisma.shift.createMany({
    data: shifts,
  });
  console.log(`📅 Created ${shifts.length} shifts`);

  // Create some audit logs
  await prisma.auditLog.create({
    data: {
      action: 'USER_CREATED',
      userId: admin.id,
      details: JSON.stringify({ createdUser: admin.email }),
    },
  });

  console.log('✅ Database seeding completed!');
  console.log('\n📝 Test accounts:');
  console.log('   Admin: admin@clinica.com / admin123');
  console.log('   Doctor: dr.garcia@clinica.com / doctor123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
