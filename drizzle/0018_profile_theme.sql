ALTER TABLE "profiles" ADD COLUMN "theme_bg" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "theme_emoji" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_theme_length" CHECK (char_length(coalesce("profiles"."theme_bg", '')) <= 20 and char_length(coalesce("profiles"."theme_emoji", '')) <= 8);--> statement-breakpoint
-- Users may change their own profile look.
GRANT UPDATE (theme_bg, theme_emoji) ON public.profiles TO authenticated;
