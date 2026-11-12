-- Explicit Data API privileges, so the app works whether or not the Supabase
-- project "automatically exposes new tables". Row Level Security (0001) still
-- decides which rows each user can see or change.
GRANT USAGE ON SCHEMA public TO anon, authenticated;--> statement-breakpoint
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;--> statement-breakpoint
GRANT INSERT ON public.categories, public.items, public.reviews, public.review_photos,
  public.category_follows, public.user_follows, public.reports TO authenticated;--> statement-breakpoint
GRANT DELETE ON public.categories, public.items, public.reviews, public.review_photos,
  public.category_follows, public.user_follows, public.reports TO authenticated;--> statement-breakpoint
GRANT UPDATE ON public.categories, public.items, public.review_photos, public.reports TO authenticated;--> statement-breakpoint
GRANT INSERT, UPDATE, DELETE ON public.category_aliases TO authenticated;--> statement-breakpoint
-- Column-limited updates (set in 0001, repeated here for projects without auto-expose).
GRANT UPDATE (username, display_name, avatar_url, bio, locale) ON public.profiles TO authenticated;--> statement-breakpoint
GRANT UPDATE (rating, body, contains_spoiler) ON public.reviews TO authenticated;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.suggest_categories(text, int), public.suggest_items(uuid, text, int)
  TO anon, authenticated;
