import {
  pgEnum,
  varchar,
  pgSchema,
  boolean,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const accountTypeEnum = pgEnum('account_type', ['personal', 'business']);

export const usersSchema = pgSchema('users_schema');

export const accounts = usersSchema.table('accounts', {
  id: uuid().primaryKey().defaultRandom(),
  accountType: accountTypeEnum('account_type').default('personal').notNull(),
  email: varchar({ length: 255 }).unique().notNull(),
  password: varchar({ length: 255 }).notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const refreshTokens = usersSchema.table('refresh_tokens', {
  id: uuid().primaryKey().defaultRandom(),
  accountId: uuid('account_id')
    .references(() => accounts.id, { onDelete: 'cascade' })
    .notNull(),
  refreshToken: varchar('refresh_token', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  created_at: timestamp().defaultNow().notNull(),
});
