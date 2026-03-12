ALTER TABLE "users_schema"."refresh_tokens" RENAME COLUMN "refresh_token" TO "token_hash";--> statement-breakpoint
ALTER TABLE "users_schema"."refresh_tokens" ADD COLUMN "token_id" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "users_schema"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_token_id_unique" UNIQUE("token_id");