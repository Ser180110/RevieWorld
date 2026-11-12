/**
 * Phase 1 database schema (see the design doc).
 *
 * Chain: categories -> items -> reviews. Categories and items are created by
 * users; `normalized_name` (lowercase, no accents, no punctuation) is unique so
 * that "Tombini" and "tombini!" cannot become two categories. Fuzzy duplicate
 * detection (pg_trgm), counters, auth links and Row Level Security live in the
 * hand-written SQL migration `drizzle/0001_rules.sql`.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["user", "moderator", "admin"]);
export const contentStatus = pgEnum("content_status", [
  "active",
  "hidden",
  "merged",
]);
export const reportTarget = pgEnum("report_target", [
  "category",
  "item",
  "review",
  "user",
]);
export const reportStatus = pgEnum("report_status", [
  "open",
  "resolved",
  "dismissed",
]);
export const localeEnum = pgEnum("locale", ["it", "en"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

/** One row per Supabase auth user (id = auth.users.id). */
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    username: text("username").notNull(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    location: text("location"),
    website: text("website"),
    locale: localeEnum("locale").notNull().default("it"),
    role: userRole("role").notNull().default("user"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("profiles_username_key").on(sql`lower(${t.username})`),
    check(
      "profiles_username_format",
      sql`${t.username} ~ '^[a-zA-Z0-9_]{3,30}$'`,
    ),
  ],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    normalizedName: text("normalized_name").notNull(),
    description: text("description"),
    icon: text("icon"),
    coverUrl: text("cover_url"),
    createdBy: uuid("created_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    status: contentStatus("status").notNull().default("active"),
    mergedIntoId: uuid("merged_into_id"),
    itemsCount: integer("items_count").notNull().default(0),
    reviewsCount: integer("reviews_count").notNull().default(0),
    followersCount: integer("followers_count").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("categories_slug_key").on(t.slug),
    uniqueIndex("categories_normalized_name_key").on(t.normalizedName),
    check(
      "categories_name_length",
      sql`char_length(${t.name}) between 2 and 60`,
    ),
  ],
);

/** Other names that point to a category ("chiusini" -> "Tombini"). */
export const categoryAliases = pgTable(
  "category_aliases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
    normalizedAlias: text("normalized_alias").notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [uniqueIndex("category_aliases_normalized_key").on(t.normalizedAlias)],
);

export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    normalizedName: text("normalized_name").notNull(),
    description: text("description"),
    coverUrl: text("cover_url"),
    createdBy: uuid("created_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    status: contentStatus("status").notNull().default("active"),
    mergedIntoId: uuid("merged_into_id"),
    reviewsCount: integer("reviews_count").notNull().default(0),
    ratingSum: integer("rating_sum").notNull().default(0),
    /** Average on the 1-10 scale (shown as half stars). */
    avgRating: numeric("avg_rating", { precision: 4, scale: 2 }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("items_category_slug_key").on(t.categoryId, t.slug),
    uniqueIndex("items_category_normalized_key").on(
      t.categoryId,
      t.normalizedName,
    ),
    check("items_name_length", sql`char_length(${t.name}) between 2 and 120`),
  ],
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    /** 1-10, displayed as 0.5-5 stars. */
    rating: smallint("rating").notNull(),
    body: text("body"),
    containsSpoiler: boolean("contains_spoiler").notNull().default(false),
    status: contentStatus("status").notNull().default("active"),
    likesCount: integer("likes_count").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("reviews_user_item_key").on(t.userId, t.itemId),
    index("reviews_item_created_idx").on(t.itemId, t.createdAt),
    index("reviews_user_created_idx").on(t.userId, t.createdAt),
    index("reviews_created_idx").on(t.createdAt),
    check("reviews_rating_range", sql`${t.rating} between 1 and 10`),
    check(
      "reviews_body_length",
      sql`${t.body} is null or char_length(${t.body}) <= 5000`,
    ),
  ],
);

export const reviewPhotos = pgTable(
  "review_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    /** Path inside the `review-photos` storage bucket. */
    storagePath: text("storage_path").notNull(),
    width: integer("width"),
    height: integer("height"),
    position: smallint("position").notNull().default(0),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    index("review_photos_review_idx").on(t.reviewId),
    check("review_photos_position_range", sql`${t.position} between 0 and 3`),
  ],
);

export const reviewLikes = pgTable(
  "review_likes",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.reviewId] }),
    index("review_likes_review_idx").on(t.reviewId),
  ],
);

/** "Mi aggrego alla categoria". */
export const categoryFollows = pgTable(
  "category_follows",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.categoryId] }),
    index("category_follows_category_idx").on(t.categoryId),
  ],
);

export const userFollows = pgTable(
  "user_follows",
  {
    followerId: uuid("follower_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    followedId: uuid("followed_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followedId] }),
    index("user_follows_followed_idx").on(t.followedId),
    check("user_follows_not_self", sql`${t.followerId} <> ${t.followedId}`),
  ],
);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: uuid("reporter_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    targetType: reportTarget("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    reason: text("reason").notNull(),
    status: reportStatus("status").notNull().default("open"),
    resolvedBy: uuid("resolved_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [index("reports_open_idx").on(t.status, t.createdAt)],
);

/** User lists ("I miei tombini preferiti"), Letterboxd style: items from any category. */
export const lists = pgTable(
  "lists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    ranked: boolean("ranked").notNull().default(false),
    itemsCount: integer("items_count").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index("lists_user_idx").on(t.userId, t.updatedAt),
    check("lists_title_length", sql`char_length(${t.title}) between 1 and 100`),
    check(
      "lists_description_length",
      sql`${t.description} is null or char_length(${t.description}) <= 1000`,
    ),
  ],
);

export const listItems = pgTable(
  "list_items",
  {
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    primaryKey({ columns: [t.listId, t.itemId] }),
    index("list_items_order_idx").on(t.listId, t.position),
    index("list_items_item_idx").on(t.itemId),
  ],
);
