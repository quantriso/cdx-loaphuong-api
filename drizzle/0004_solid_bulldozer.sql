CREATE TABLE "comment_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" varchar(36) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"vote_type" varchar(10) NOT NULL,
	"voted_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "comment_votes_comment_id_idx" (

);
--> statement-breakpoint
CREATE TABLE "comment_votes_user_id_idx" (

);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" varchar(25) PRIMARY KEY NOT NULL,
	"content_id" varchar(25) NOT NULL,
	"parent_comment_id" varchar(25),
	"author_id" varchar(25) NOT NULL,
	"content" text NOT NULL,
	"tenant_id" varchar(25) NOT NULL,
	"moderation_status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"mentions" text[],
	"like_count" integer DEFAULT 0 NOT NULL,
	"dislike_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "deleted_by" varchar(36);--> statement-breakpoint
ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_comments_content_id" ON "comments" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "idx_comments_parent_comment_id" ON "comments" USING btree ("parent_comment_id");--> statement-breakpoint
CREATE INDEX "idx_comments_author_id" ON "comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "idx_comments_moderation_status" ON "comments" USING btree ("moderation_status");--> statement-breakpoint
CREATE INDEX "idx_comments_tenant_id" ON "comments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_comments_content_tenant" ON "comments" USING btree ("content_id","tenant_id");