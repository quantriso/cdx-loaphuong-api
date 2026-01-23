CREATE TABLE "contents" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(36) NOT NULL,
	"author_id" varchar(36) NOT NULL,
	"title" varchar(200) NOT NULL,
	"content" text NOT NULL,
	"excerpt" varchar(500),
	"status" varchar(20) DEFAULT 'DRAFT' NOT NULL,
	"type" varchar(20) NOT NULL,
	"priority" varchar(20) DEFAULT 'MEDIUM' NOT NULL,
	"category_id" varchar(36),
	"featured_image" varchar(500),
	"tags" jsonb DEFAULT '[]'::jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_contents_tenant_id" ON "contents" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_contents_author_id" ON "contents" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "idx_contents_status" ON "contents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_contents_type" ON "contents" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_contents_category_id" ON "contents" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_contents_created_at" ON "contents" USING btree ("created_at");