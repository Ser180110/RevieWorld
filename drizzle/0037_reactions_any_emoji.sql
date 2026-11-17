ALTER TYPE "public"."notification_type" ADD VALUE 'comment_reaction';--> statement-breakpoint
ALTER TABLE "comment_reactions" DROP CONSTRAINT "comment_reactions_emoji_known";--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "emoji" text;--> statement-breakpoint
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_emoji_valid" CHECK (char_length("comment_reactions"."emoji") between 1 and 16 and "comment_reactions"."emoji" !~ '[A-Za-z0-9[:space:]<>&"]');