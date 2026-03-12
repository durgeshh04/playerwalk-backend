import {
  pgEnum,
  varchar,
  pgSchema,
  boolean,
  timestamp,
  uuid,
  text,
  primaryKey,
} from 'drizzle-orm/pg-core';

export const accountTypeEnum = pgEnum('account_type', ['personal', 'business']);

export const usersSchema = pgSchema('users_schema');

export const accounts = usersSchema.table('accounts', {
  id: uuid().primaryKey().defaultRandom(),
  accountType: accountTypeEnum('account_type').default('personal').notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  password: varchar('password', { length: 255 }).notNull(),
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
  tokenId: varchar('token_id', { length: 255 }).unique().notNull(),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const otps = usersSchema.table('otps', {
  id: uuid().primaryKey().defaultRandom(),
  accountId: uuid('account_id')
    .references(() => accounts.id, { onDelete: 'cascade' })
    .notNull(),
  otp: varchar('otp', { length: 6 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  isUsed: boolean('is_used').default(false).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userProfile = usersSchema.table('user_profile', {
  id: uuid().primaryKey().defaultRandom(),
  accountId: uuid('account_id')
    .references(() => accounts.id, { onDelete: 'cascade' })
    .notNull(),
  fullName: varchar('fullname', { length: 255 }),
  username: varchar('username', { length: 100 }).unique(),
  bio: text(),
  avatar: varchar('avatar', { length: 500 }),
  location: varchar('location', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const roles = usersSchema.table('roles', {
  id: uuid().primaryKey().defaultRandom(),
  role: varchar('role', { length: 100 }).unique().notNull(),
  description: text(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userRoles = usersSchema.table(
  'user_roles',
  {
    accountId: uuid('account_id')
      .references(() => accounts.id, { onDelete: 'cascade' })
      .notNull(),
    roleId: uuid('role_id')
      .references(() => roles.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.accountId, table.roleId] })],
);
