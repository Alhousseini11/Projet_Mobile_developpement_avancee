import 'dotenv/config';
import { Prisma, PrismaClient, Role, ReservationStatus, Severity, TutorialDifficulty } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  // Clean tables (order matters because of FK)
  await prisma.reservationPhoto.deleteMany();
  await prisma.review.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.location.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.tutorial.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.user.deleteMany();

  // Users
  const [alice, bob, admin] = await Promise.all([
    prisma.user.create({
      data: {
        email: 'alice@example.com',
        passwordHash: 'hashed-password',
        fullName: 'Alice Driver',
        role: Role.USER,
        phone: '+15550000001',
      },
    }),
    prisma.user.create({
      data: {
        email: 'bob.mechanic@example.com',
        passwordHash: 'hashed-password',
        fullName: 'Bob Mechanic',
        role: Role.MECHANIC,
        phone: '+15550000002',
      },
    }),
    prisma.user.create({
      data: {
        email: 'admin@example.com',
        passwordHash: 'hashed-password',
        fullName: 'Ada Admin',
        role: Role.ADMIN,
        phone: '+15550000003',
      },
    }),
  ]);

  // Locations
  const loc = await prisma.location.create({
    data: {
      address: '123 Main St, Springfield',
      lat: 37.7749,
      lng: -122.4194,
      routeUrl: 'https://maps.google.com/?q=37.7749,-122.4194',
    },
  });

  // Vehicles
  const aliceCar = await prisma.vehicle.create({
    data: {
      userId: alice.id,
      brand: 'Toyota',
      model: 'Corolla',
      year: 2020,
      mileage: 45000,
    },
  });

  // Reservation
  const reservation = await prisma.reservation.create({
    data: {
      userId: alice.id,
      mechanicId: bob.id,
      serviceType: 'Oil change',
      description: 'Regular maintenance',
      status: ReservationStatus.CONFIRMED,
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      amount: new Prisma.Decimal('120.00'),
      currency: 'USD',
      locationId: loc.id,
    },
  });

  await prisma.reservationPhoto.create({
    data: {
      reservationId: reservation.id,
      url: 'https://example.com/photo.jpg',
    },
  });

  await prisma.reminder.create({
    data: {
      vehicleId: aliceCar.id,
      title: 'Brake pads check',
      dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      severity: Severity.WARN,
    },
  });

  // Tutorials
  await prisma.tutorial.create({
    data: {
      title: 'Change your engine oil',
      category: 'Maintenance',
      difficulty: TutorialDifficulty.MEDIUM,
      videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
      thumbnail: 'https://example.com/thumb.jpg',
      durationSec: 420,
    },
  });

  // Notifications
  await prisma.notification.create({
    data: {
      userId: alice.id,
      type: 'APPOINTMENT',
      title: 'Votre rendez-vous est confirmé',
      body: 'Oil change prévu demain.',
    },
  });

  // Chat sample
  await prisma.chatMessage.createMany({
    data: [
      {
        senderId: alice.id,
        receiverId: bob.id,
        body: 'Bonjour, pouvez-vous vérifier aussi les freins ?',
      },
      {
        senderId: bob.id,
        receiverId: alice.id,
        body: 'Oui, je m’en occupe.',
      },
    ],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
