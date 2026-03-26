import 'dotenv/config';
import { Prisma, PrismaClient, ReservationStatus, Role, Severity } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import crypto from 'crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

async function main() {
  await prisma.favorite.deleteMany();
  await prisma.review.deleteMany();
  await prisma.reservationPhoto.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.maintenanceRecord.deleteMany();
  await prisma.vehicleDocument.deleteMany();
  await prisma.vehicleInsurance.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.userProfileSettings.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.tutorial.deleteMany();
  await prisma.reservationService.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.location.deleteMany();
  await prisma.user.deleteMany();

  const [alice, bob, admin] = await Promise.all([
    prisma.user.create({
      data: {
        email: 'alice@example.com',
        passwordHash: hashPassword('Garage123!'),
        fullName: 'Alice Driver',
        role: Role.USER,
        phone: '+15550000001'
      }
    }),
    prisma.user.create({
      data: {
        email: 'bob.mechanic@example.com',
        passwordHash: hashPassword('Mechanic123!'),
        fullName: 'Bob Mechanic',
        role: Role.MECHANIC,
        phone: '+15550000002'
      }
    }),
    prisma.user.create({
      data: {
        email: 'admin@example.com',
        passwordHash: hashPassword('Admin123!'),
        fullName: 'Ada Admin',
        role: Role.ADMIN,
        phone: '+15550000003'
      }
    })
  ]);

  await prisma.reservationService.createMany({
    data: [
      {
        id: 'service-oil-change',
        slug: 'oil-change',
        label: 'Vidange',
        description: 'Entretien regulier avec remplacement huile et filtre.',
        durationMinutes: 45,
        price: new Prisma.Decimal('79.00'),
        slotTimes: ['08:30', '10:00', '13:30', '15:00'],
        active: true
      },
      {
        id: 'service-brakes',
        slug: 'brakes',
        label: 'Freins',
        description: 'Inspection et entretien des freins.',
        durationMinutes: 90,
        price: new Prisma.Decimal('149.00'),
        slotTimes: ['09:00', '11:30', '14:00', '16:30'],
        active: true
      },
      {
        id: 'service-battery',
        slug: 'battery',
        label: 'Batterie',
        description: 'Controle ou remplacement de batterie.',
        durationMinutes: 30,
        price: new Prisma.Decimal('99.00'),
        slotTimes: ['08:00', '10:30', '13:00', '17:00'],
        active: true
      },
      {
        id: 'service-diagnostic',
        slug: 'diagnostic',
        label: 'Diagnostic',
        description: 'Lecture des codes et diagnostic general.',
        durationMinutes: 60,
        price: new Prisma.Decimal('59.00'),
        slotTimes: ['09:30', '12:00', '15:30', '18:00'],
        active: true
      }
    ]
  });

  const location = await prisma.location.create({
    data: {
      address: '123 Main St, Springfield',
      lat: 37.7749,
      lng: -122.4194,
      routeUrl: 'https://maps.google.com/?q=37.7749,-122.4194'
    }
  });

  const aliceVehicle = await prisma.vehicle.create({
    data: {
      userId: alice.id,
      name: 'Toyota',
      model: 'Corolla',
      year: 2020,
      mileage: 45000,
      type: 'sedan',
      licensePlate: 'ABC-123',
      fuelType: 'Essence',
      color: 'Bleu'
    }
  });

  await prisma.userProfileSettings.create({
    data: {
      userId: alice.id,
      membershipLabel: 'Client premium',
      verified: true,
      memberSince: new Date('2024-01-12T00:00:00Z'),
      preferredGarage: 'Garage Montreal Centre',
      defaultVehicleLabel: 'Toyota Corolla',
      loyaltyPoints: 240,
      addressLine: '123 Main St',
      city: 'Springfield',
      notes: 'Client de demonstration pour les tests locaux.'
    }
  });

  const reservation = await prisma.reservation.create({
    data: {
      userId: alice.id,
      vehicleId: aliceVehicle.id,
      mechanicId: bob.id,
      serviceType: 'oil-change',
      description: 'Regular maintenance',
      status: ReservationStatus.CONFIRMED,
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      amount: new Prisma.Decimal('90.85'),
      currency: 'CAD',
      locationId: location.id
    }
  });

  await prisma.reservationPhoto.create({
    data: {
      reservationId: reservation.id,
      url: 'https://example.com/photo.jpg'
    }
  });

  await prisma.review.create({
    data: {
      userId: alice.id,
      reservationId: reservation.id,
      rating: 5,
      comment: 'Intervention rapide et explications claires.'
    }
  });

  await prisma.reminder.create({
    data: {
      vehicleId: aliceVehicle.id,
      title: 'Brake pads check',
      dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      severity: Severity.WARN
    }
  });

  await prisma.maintenanceRecord.create({
    data: {
      vehicleId: aliceVehicle.id,
      type: 'oil_change',
      description: 'Vidange complete',
      mileage: 45000,
      cost: new Prisma.Decimal('79.00'),
      date: new Date()
    }
  });

  await prisma.vehicleDocument.create({
    data: {
      vehicleId: aliceVehicle.id,
      type: 'registration',
      title: 'Carte grise',
      fileUrl: 'https://example.com/registration.pdf'
    }
  });

  await prisma.vehicleInsurance.create({
    data: {
      vehicleId: aliceVehicle.id,
      provider: 'AssureAuto',
      policyNumber: 'POL-12345',
      startDate: new Date('2026-01-01T00:00:00Z'),
      endDate: new Date('2026-12-31T00:00:00Z'),
      coverage: 'Tous risques',
      phoneNumber: '+15550000099'
    }
  });

  const tutorial = await prisma.tutorial.create({
    data: {
      title: 'Change your engine oil',
      description: 'Guide atelier pour effectuer une vidange en securite.',
      category: 'entretien',
      difficulty: 'moyen',
      videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
      thumbnail: 'https://example.com/thumb.jpg',
      duration: 7,
      views: 120,
      rating: 4.7,
      instructions: [
        'Laissez refroidir le moteur.',
        'Placez un bac de recuperation sous le carter.',
        'Remplacez le filtre a huile puis refaites le niveau.'
      ],
      tools: ['Cle a filtre', 'Bac de recuperation', 'Huile moteur']
    }
  });

  await prisma.favorite.create({
    data: {
      userId: alice.id,
      tutorialId: tutorial.id
    }
  });

  await prisma.notification.create({
    data: {
      userId: alice.id,
      type: 'APPOINTMENT',
      title: 'Votre rendez-vous est confirme',
      body: 'Vidange prevue demain matin.'
    }
  });

  await prisma.paymentMethod.create({
    data: {
      userId: alice.id,
      provider: 'stripe',
      status: 'ready',
      stripeRef: 'cus_demo_alice',
      brand: 'visa',
      last4: '4242',
      expMonth: 12,
      expYear: 2030,
      lastCheckoutSessionId: 'cs_test_demo_alice',
      lastSyncAt: new Date()
    }
  });

  await prisma.quote.create({
    data: {
      userId: alice.id,
      serviceType: 'brakes',
      estimated: new Prisma.Decimal('171.35'),
      currency: 'CAD'
    }
  });

  await prisma.chatMessage.createMany({
    data: [
      {
        senderId: alice.id,
        receiverId: bob.id,
        body: 'Bonjour, pouvez-vous verifier aussi les freins ?'
      },
      {
        senderId: bob.id,
        receiverId: alice.id,
        body: 'Oui, je m en occupe.'
      }
    ]
  });

  console.log(
    JSON.stringify(
      {
        users: {
          alice: alice.email,
          bob: bob.email,
          admin: admin.email
        },
        seededPasswords: {
          alice: 'Garage123!',
          mechanic: 'Mechanic123!',
          admin: 'Admin123!'
        },
        reservationId: reservation.id,
        tutorialId: tutorial.id
      },
      null,
      2
    )
  );
}

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
