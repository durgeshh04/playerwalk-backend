import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';

export const userCategoryEnum = pgEnum('user_category', [
  'normal',
  'business',
]);

export const userRoleEnum = pgEnum('user_role', [
  'player',
  'coach',
  'sports_fan',
  'academy',
]);

export const users = pgTable('users', {
  id:          uuid('id').primaryKey().defaultRandom(),

  // Auth
  email:       varchar('email', { length: 255 }).unique(),
  phone:       varchar('phone', { length: 20 }).unique(),
  password:    varchar('password', { length: 255 }).notNull(),

  // Who they are
  category:    userCategoryEnum('category').notNull(),
  role:        userRoleEnum('role').notNull(),

  // Profile page basics
  name:        varchar('name', { length: 255 }).notNull(),
  bio:         text('bio'),
  photoUrl:    text('photo_url'),
  city:        varchar('city', { length: 100 }),
  state:       varchar('state', { length: 100 }),

  // Account flags
  isVerified:  boolean('is_verified').default(false),
  isActive:    boolean('is_active').default(true),
  isPrivate:   boolean('is_private').default(false),

  createdAt:   timestamp('created_at').defaultNow(),
  updatedAt:   timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
  deletedAt:   timestamp('deleted_at'),
});
