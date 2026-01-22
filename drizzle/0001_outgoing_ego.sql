ALTER TABLE "outbox" ALTER COLUMN "status" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "outbox" ALTER COLUMN "status" SET DEFAULT 'PENDING';--> statement-breakpoint
DROP TYPE "public"."outbox_status";