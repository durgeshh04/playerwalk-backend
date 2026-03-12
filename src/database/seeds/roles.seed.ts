import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../schema';
import { roles } from '../schema';

export async function seedRoles() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client, { schema });

  try {
    const existing = await db.select().from(roles).limit(1);
    if (existing.length > 0) {
      console.log('✓ Roles already seeded, skipping');
      await client.end();
      return;
    }

    await db.insert(roles).values([
      { role: 'sportsfan', description: 'Default role for all users' },
      { role: 'player', description: 'Active sports player' },
      { role: 'coach', description: 'Sports coach or trainer' },
    ]);

    console.log('✓ Roles seeded successfully');
  } catch (error) {
    console.error('✗ Roles seeding failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}
