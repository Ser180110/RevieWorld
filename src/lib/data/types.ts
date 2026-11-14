export type CategorySummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  items_count: number;
  reviews_count: number;
  followers_count: number;
  created_by: string | null;
  normalized_name: string;
  icon: string | null;
  color: string | null;
};

export type ItemSummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  reviews_count: number;
  avg_rating: string | null;
  /** Storage path of a photo from one of its reviews, when there is one. */
  cover?: string | null;
};

export type ReviewRow = {
  id: string;
  rating: number;
  body: string | null;
  contains_spoiler: boolean;
  created_at: string;
  likes_count: number;
  comments_count: number;
  photos?: { id: string; storage_path: string; position: number }[];
  user_id: string;
  author: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  item?: {
    name: string;
    slug: string;
    category: { name: string; slug: string; icon?: string | null; color?: string | null } | null;
  } | null;
};

export type Suggestion = {
  id: string;
  name: string;
  slug: string;
  reviews_count: number;
  score: number;
};

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  created_at: string;
  /** "founder" for the creator of RevieWorld (missing before migration 0017). */
  badge?: string | null;
  /** Profile look (missing before migration 0018). */
  theme_bg?: string | null;
  theme_emoji?: string | null;
};

export type ProfileStats = {
  reviews: number;
  followers: number;
  following: number;
};

/** Who is looking at a list of reviews: drives the like and delete buttons. */
export type Viewer = {
  id: string | null;
  liked: string[];
};

export type ProfileCard = Pick<
  Profile,
  "id" | "username" | "display_name" | "avatar_url" | "bio"
>;

export type ListSummary = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  ranked: boolean;
  items_count: number;
  updated_at: string;
  owner: { username: string; display_name: string | null } | null;
};

export type ListEntry = {
  position: number;
  item: {
    id: string;
    name: string;
    slug: string;
    avg_rating: string | null;
    reviews_count: number;
    category: { name: string; slug: string } | null;
  } | null;
};

export type ItemSearchResult = {
  id: string;
  name: string;
  category: { name: string } | null;
};

export type ItemCard = {
  id: string;
  name: string;
  slug: string;
  avg_rating: string | null;
  category: { name: string; slug: string } | null;
};

export type Comment = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  author: { username: string; display_name: string | null; avatar_url: string | null } | null;
};
