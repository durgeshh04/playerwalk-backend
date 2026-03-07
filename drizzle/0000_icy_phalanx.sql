CREATE TYPE "public"."user_category" AS ENUM('normal', 'business');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('player', 'coach', 'sports_fan', 'academy');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255),
	"phone" varchar(20),
	"password" varchar(255) NOT NULL,
	"category" "user_category" NOT NULL,
	"role" "user_role" NOT NULL,
	"name" varchar(255) NOT NULL,
	"bio" text,
	"photo_url" text,
	"city" varchar(100),
	"state" varchar(100),
	"is_verified" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"is_private" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
