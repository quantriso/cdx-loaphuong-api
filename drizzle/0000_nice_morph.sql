CREATE TYPE "public"."outbox_status" AS ENUM('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"admin_email" varchar(255) NOT NULL,
	"admin_password_hash" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"branding_config" jsonb,
	"limits" jsonb,
	"created_by" varchar(255),
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"aggregate_id" varchar(36) NOT NULL,
	"aggregate_type" varchar(100) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"payload" text NOT NULL,
	"status" "outbox_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"last_error" text
);
--> statement-breakpoint
CREATE INDEX "idx_tenants_tenant_id" ON "tenants" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_tenants_status" ON "tenants" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_tenants_deleted_at" ON "tenants" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_tenants_created_at" ON "tenants" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_outbox_status_created" ON "outbox" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_outbox_aggregate" ON "outbox" USING btree ("aggregate_id");--> statement-breakpoint
CREATE INDEX "idx_outbox_event_type" ON "outbox" USING btree ("event_type");