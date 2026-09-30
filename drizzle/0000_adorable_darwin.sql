CREATE TYPE "public"."bathroom_lock" AS ENUM('key', 'code');--> statement-breakpoint
CREATE TYPE "public"."cafe_location_type" AS ENUM('cafe', 'restaurant', 'coworking space', 'patio', 'other');--> statement-breakpoint
CREATE TABLE "cafes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "cafes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"created_by_user_id" integer,
	"updated_by_user_id" integer,
	"name" varchar(255) NOT NULL,
	"address" varchar(500) NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"location_type" "cafe_location_type" NOT NULL,
	"wifi_available" boolean DEFAULT false NOT NULL,
	"wifi_name" varchar(255) DEFAULT '' NOT NULL,
	"wifi_password" varchar(255) DEFAULT '' NOT NULL,
	"wifi_fast" boolean DEFAULT false NOT NULL,
	"outlet" boolean DEFAULT false NOT NULL,
	"bathroom_available" boolean DEFAULT false NOT NULL,
	"bathroom_clean" boolean DEFAULT false NOT NULL,
	"bathroom_lock" "bathroom_lock",
	"seating" boolean DEFAULT false NOT NULL,
	"clean" boolean DEFAULT false NOT NULL,
	"busy_morning" boolean DEFAULT false NOT NULL,
	"busy_afternoon" boolean DEFAULT false NOT NULL,
	"busy_evening" boolean DEFAULT false NOT NULL,
	"parking" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "cafes_latitude_check" CHECK ("cafes"."latitude" >= -90 AND "cafes"."latitude" <= 90),
	CONSTRAINT "cafes_longitude_check" CHECK ("cafes"."longitude" >= -180 AND "cafes"."longitude" <= 180)
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "refresh_tokens_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"jti" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_favorite_cafes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_favorite_cafes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"cafe_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"image" varchar(255),
	"preferences" jsonb DEFAULT '{"colorMode":"light","displayName":"","performanceMode":false}'::jsonb NOT NULL,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "unique_user" UNIQUE("public_id"),
	CONSTRAINT "unique_user_email" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "cafes" ADD CONSTRAINT "cafes_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cafes" ADD CONSTRAINT "cafes_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorite_cafes" ADD CONSTRAINT "user_favorite_cafes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorite_cafes" ADD CONSTRAINT "user_favorite_cafes_cafe_id_cafes_id_fk" FOREIGN KEY ("cafe_id") REFERENCES "public"."cafes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cafes_public_id_unique" ON "cafes" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "cafes_created_by_user_id_idx" ON "cafes" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "cafes_coordinates_idx" ON "cafes" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_tokens_jti_unique" ON "refresh_tokens" USING btree ("jti");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_favorite_cafes_user_cafe_unique" ON "user_favorite_cafes" USING btree ("user_id","cafe_id");--> statement-breakpoint
CREATE INDEX "user_favorite_cafes_cafe_id_idx" ON "user_favorite_cafes" USING btree ("cafe_id");