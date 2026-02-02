CREATE TABLE "categories" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(36) NOT NULL,
	"value" varchar(100) NOT NULL,
	"label" varchar(100) NOT NULL,
	"description" text,
	"color" varchar(7),
	"icon" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"parent_id" varchar(36),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" varchar(36),
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(36) NOT NULL,
	"updated_by" varchar(36)
);
--> statement-breakpoint
CREATE TABLE "content_tags" (
	"content_id" varchar(36) NOT NULL,
	"tag_id" varchar(36) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "content_tags_content_id_tag_id_pk" PRIMARY KEY("content_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(36) NOT NULL,
	"original_file_name" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"file_size" bigint NOT NULL,
	"file_type" varchar(20) NOT NULL,
	"storage_path" varchar(500) NOT NULL,
	"storage_provider" varchar(50) DEFAULT 'local' NOT NULL,
	"processed_path" varchar(500),
	"thumbnail_path" varchar(500),
	"processed_metadata" jsonb,
	"uploaded_by" varchar(36) NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(36) NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"color" varchar(7),
	"category" varchar(50) NOT NULL,
	"synonyms" text[] DEFAULT '{}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" varchar(36),
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(36) NOT NULL,
	"updated_by" varchar(36),
	CONSTRAINT "uq_tags_tenant_slug" UNIQUE("tenant_id","slug")
);
--> statement-breakpoint
CREATE INDEX "idx_content_tags_content_id" ON "content_tags" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "idx_content_tags_tag_id" ON "content_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "idx_files_tenant_id" ON "files" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_files_file_type" ON "files" USING btree ("file_type");--> statement-breakpoint
CREATE INDEX "idx_files_uploaded_by" ON "files" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "idx_files_created_at" ON "files" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_files_deleted_at" ON "files" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_tags_tenant_id" ON "tags" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_tags_slug" ON "tags" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_tags_category" ON "tags" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_tags_is_active" ON "tags" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_tags_is_deleted" ON "tags" USING btree ("is_deleted");