import * as dotenv from 'dotenv';
dotenv.config();

import { seedRoles } from './roles.seed';

async function runSeeds() {
  console.log('Starting database seeding...');

  try {
    await seedRoles();
    console.log('All seeds completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

runSeeds();
