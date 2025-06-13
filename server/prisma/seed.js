const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Create bases
  const bases = await Promise.all([
    prisma.base.create({
      data: {
        name: 'Fort Liberty',
        code: 'FL001',
        location: 'North Carolina, USA',
        description: 'Primary training and deployment base'
      }
    }),
    prisma.base.create({
      data: {
        name: 'Camp Pendleton',
        code: 'CP002',
        location: 'California, USA',
        description: 'Marine Corps base for amphibious operations'
      }
    }),
    prisma.base.create({
      data: {
        name: 'Joint Base Lewis-McChord',
        code: 'JBLM003',
        location: 'Washington, USA',
        description: 'Joint Army and Air Force base'
      }
    })
  ]);

  console.log('Created bases:', bases.map(b => b.name));

  // Hash password for all users
  const hashedPassword = await bcrypt.hash('password123', 12);

  // Create users
  const users = await Promise.all([
    // Admin user
    prisma.user.create({
      data: {
        email: 'admin@military.gov',
        username: 'admin',
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Administrator',
        role: 'ADMIN'
      }
    }),
    // Base commanders
    prisma.user.create({
      data: {
        email: 'commander.fl@military.gov',
        username: 'cmd_fl',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Smith',
        role: 'BASE_COMMANDER',
        baseId: bases[0].id
      }
    }),
    prisma.user.create({
      data: {
        email: 'commander.cp@military.gov',
        username: 'cmd_cp',
        password: hashedPassword,
        firstName: 'Sarah',
        lastName: 'Johnson',
        role: 'BASE_COMMANDER',
        baseId: bases[1].id
      }
    }),
    // Logistics officers
    prisma.user.create({
      data: {
        email: 'logistics.fl@military.gov',
        username: 'log_fl',
        password: hashedPassword,
        firstName: 'Mike',
        lastName: 'Wilson',
        role: 'LOGISTICS_OFFICER',
        baseId: bases[0].id
      }
    }),
    prisma.user.create({
      data: {
        email: 'logistics.cp@military.gov',
        username: 'log_cp',
        password: hashedPassword,
        firstName: 'Lisa',
        lastName: 'Brown',
        role: 'LOGISTICS_OFFICER',
        baseId: bases[1].id
      }
    })
  ]);

  console.log('Created users:', users.map(u => u.email));

  // Create sample purchases
  const purchases = await Promise.all([
    prisma.purchase.create({
      data: {
        purchaseOrder: 'PO-2024-001',
        vendor: 'Defense Contractors Inc.',
        totalAmount: 250000.00,
        purchaseDate: new Date('2024-01-15'),
        description: 'Vehicle procurement for base operations',
        baseId: bases[0].id,
        createdById: users[1].id // Base commander
      }
    }),
    prisma.purchase.create({
      data: {
        purchaseOrder: 'PO-2024-002',
        vendor: 'Military Supplies Corp',
        totalAmount: 75000.00,
        purchaseDate: new Date('2024-02-01'),
        description: 'Communication equipment upgrade',
        baseId: bases[1].id,
        createdById: users[2].id // Base commander
      }
    })
  ]);

  console.log('Created purchases:', purchases.map(p => p.purchaseOrder));

  // Create sample assets
  const assets = await Promise.all([
    // Vehicles
    prisma.asset.create({
      data: {
        serialNumber: 'VH-001-2024',
        name: 'M1151 HMMWV',
        description: 'Armored utility vehicle',
        equipmentType: 'VEHICLE',
        baseId: bases[0].id,
        purchaseId: purchases[0].id,
        value: 125000.00,
        acquisitionDate: new Date('2024-01-15')
      }
    }),
    prisma.asset.create({
      data: {
        serialNumber: 'VH-002-2024',
        name: 'M1151 HMMWV',
        description: 'Armored utility vehicle',
        equipmentType: 'VEHICLE',
        baseId: bases[0].id,
        purchaseId: purchases[0].id,
        value: 125000.00,
        acquisitionDate: new Date('2024-01-15')
      }
    }),
    // Weapons
    prisma.asset.create({
      data: {
        serialNumber: 'WP-001-2024',
        name: 'M4A1 Carbine',
        description: 'Standard issue rifle',
        equipmentType: 'WEAPON',
        baseId: bases[1].id,
        value: 1200.00,
        acquisitionDate: new Date('2024-01-10')
      }
    }),
    prisma.asset.create({
      data: {
        serialNumber: 'WP-002-2024',
        name: 'M249 SAW',
        description: 'Squad automatic weapon',
        equipmentType: 'WEAPON',
        baseId: bases[1].id,
        value: 4500.00,
        acquisitionDate: new Date('2024-01-10')
      }
    }),
    // Communication equipment
    prisma.asset.create({
      data: {
        serialNumber: 'CM-001-2024',
        name: 'AN/PRC-152 Radio',
        description: 'Tactical radio system',
        equipmentType: 'COMMUNICATION',
        baseId: bases[1].id,
        purchaseId: purchases[1].id,
        value: 15000.00,
        acquisitionDate: new Date('2024-02-01')
      }
    }),
    // Ammunition
    prisma.asset.create({
      data: {
        serialNumber: 'AM-001-2024',
        name: '5.56mm NATO Rounds',
        description: 'Standard rifle ammunition (1000 rounds)',
        equipmentType: 'AMMUNITION',
        baseId: bases[0].id,
        value: 500.00,
        acquisitionDate: new Date('2024-01-20')
      }
    })
  ]);

  console.log('Created assets:', assets.map(a => a.serialNumber));

  // Create sample assignments
  const assignments = await Promise.all([
    prisma.assignment.create({
      data: {
        assetId: assets[0].id, // HMMWV
        assignedToId: users[1].id, // Base commander
        baseId: bases[0].id,
        purpose: 'Command vehicle for training exercises',
        notes: 'Assigned for 30-day training period',
        createdById: users[1].id
      }
    }),
    prisma.assignment.create({
      data: {
        assetId: assets[2].id, // M4A1
        assignedToId: users[2].id, // Base commander
        baseId: bases[1].id,
        purpose: 'Personal defense weapon',
        notes: 'Standard issue for command personnel',
        createdById: users[2].id
      }
    })
  ]);

  console.log('Created assignments:', assignments.length);

  // Update asset statuses
  await prisma.asset.update({
    where: { id: assets[0].id },
    data: { status: 'ASSIGNED' }
  });

  await prisma.asset.update({
    where: { id: assets[2].id },
    data: { status: 'ASSIGNED' }
  });

  console.log('Database seeding completed successfully!');
  console.log('\nDefault login credentials:');
  console.log('Admin: admin@military.gov / password123');
  console.log('Base Commander (FL): commander.fl@military.gov / password123');
  console.log('Base Commander (CP): commander.cp@military.gov / password123');
  console.log('Logistics Officer (FL): logistics.fl@military.gov / password123');
  console.log('Logistics Officer (CP): logistics.cp@military.gov / password123');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
