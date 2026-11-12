export type CategorySummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  items_count: number;
  reviews_count: number;
  followers_count: number;
  created_by: string | null;
};

export type ItemSummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  reviews_count: number;
  avg_rating: string | null;
};

export type ReviewRow = {
  id: string;
  rating: number;
  body: string | null;
  contains_spoiler: boolean;
  created_at: string;
  user_id: string;
  author: { username: string } | null;
  item?: {
    name: string;
    slug: string;
    category: { name: string; slug: string } | null;
  } | null;
};

export type Suggestion = {
  id: string;
  name: string;
  slug: string;
  reviews_count: number;
  score: number;
};
