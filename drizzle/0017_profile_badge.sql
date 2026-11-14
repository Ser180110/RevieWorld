ALTER TABLE "profiles" ADD COLUMN "badge" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_badge_known" CHECK ("profiles"."badge" is null or "profiles"."badge" in ('founder'));--> statement-breakpoint
-- Users can't change it: profiles only grant UPDATE on their own editable columns.
-- The founder of RevieWorld:
UPDATE "profiles" SET "badge" = 'founder' WHERE lower("username") = 'ser180110';
