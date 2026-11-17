CREATE TABLE "diary_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"review_id" uuid,
	"rating" smallint NOT NULL,
	"experienced_on" date DEFAULT current_date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "diary_entries_rating_range" CHECK ("diary_entries"."rating" between 1 and 10),
	CONSTRAINT "diary_entries_day_valid" CHECK ("diary_entries"."experienced_on" between '1900-01-01' and '2200-01-01')
);
--> statement-breakpoint
ALTER TABLE "diary_entries" ADD CONSTRAINT "diary_entries_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diary_entries" ADD CONSTRAINT "diary_entries_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diary_entries" ADD CONSTRAINT "diary_entries_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "diary_entries_user_day_idx" ON "diary_entries" USING btree ("user_id","experienced_on");--> statement-breakpoint
CREATE INDEX "diary_entries_user_item_idx" ON "diary_entries" USING btree ("user_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "diary_entries_review_key" ON "diary_entries" USING btree ("review_id");