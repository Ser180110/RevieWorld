-- People may set or change the position of their own review.
GRANT UPDATE (lat, lng) ON public.reviews TO authenticated;
