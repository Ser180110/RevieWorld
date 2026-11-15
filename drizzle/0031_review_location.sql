ALTER TABLE "reviews" ADD COLUMN "lat" double precision;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "lng" double precision;--> statement-breakpoint
CREATE INDEX "reviews_location_idx" ON "reviews" USING btree ("lat","lng");--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_location_valid" CHECK (("reviews"."lat" is null and "reviews"."lng" is null) or ("reviews"."lat" between -90 and 90 and "reviews"."lng" between -180 and 180));