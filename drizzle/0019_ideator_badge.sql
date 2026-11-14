ALTER TABLE "profiles" DROP CONSTRAINT "profiles_badge_known";--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_badge_known" CHECK ("profiles"."badge" is null or "profiles"."badge" in ('founder', 'ideator'));--> statement-breakpoint
-- The co-founder who came up with RevieWorld:
UPDATE "profiles" SET "badge" = 'ideator' WHERE lower("username") = 'corinne';
