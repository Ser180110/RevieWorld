-- Category look (emoji + colour) and a set of starter categories.

-- The creator of a category (or a moderator) can change its emoji and colour.
CREATE OR REPLACE FUNCTION public.set_category_style(cat uuid, new_icon text, new_color text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE categories
     SET icon = nullif(btrim(new_icon), ''), color = new_color
   WHERE id = cat AND (created_by = auth.uid() OR public.is_moderator());
  RETURN FOUND;
END;
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.set_category_style(uuid, text, text) FROM public, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.set_category_style(uuid, text, text) TO authenticated;--> statement-breakpoint

-- Starter categories, so the app is not empty on day one. Existing categories with
-- the same name keep their data and only get an emoji/colour if they had none.
INSERT INTO public.categories (name, slug, normalized_name, description, icon, color)
VALUES
  ('Tombini', 'tombini', 'tombini', 'Ghisa, decori, stemmi comunali: i tombini più belli (e più brutti) delle nostre strade.', '🕳️', 'sky'),
  ('Panini', 'panini', 'panini', 'Dal paninaro sotto casa alla schiacciata gourmet.', '🥪', 'amber'),
  ('Bagni degli autogrill', 'bagni-degli-autogrill', 'bagni degli autogrill', 'Pulizia, attesa, profumo: la recensione che tutti in viaggio vorrebbero leggere.', '🚻', 'teal'),
  ('Distributori automatici', 'distributori-automatici', 'distributori automatici', 'Macchinette di uffici, stazioni e ospedali: scelta, prezzi e quante volte si mangiano le monete.', '🍫', 'violet'),
  ('Panchine', 'panchine', 'panchine', 'Comodità, vista e ombra delle panchine dove fermarsi.', '🪑', 'emerald'),
  ('Gelaterie', 'gelaterie', 'gelaterie', 'Gusti, cremosità e dimensione della coppetta.', '🍦', 'rose'),
  ('Pizzerie', 'pizzerie', 'pizzerie', 'Napoletana, romana, al taglio: dove si mangia la pizza migliore.', '🍕', 'orange'),
  ('Caffè al bar', 'caffe-al-bar', 'caffe al bar', 'L''espresso del bar: crema, temperatura, prezzo e simpatia del barista.', '☕', 'amber'),
  ('Cornetti', 'cornetti', 'cornetti', 'Vuoti, alla crema, integrali: la colazione al bar sotto esame.', '🥐', 'orange'),
  ('Fontanelle', 'fontanelle', 'fontanelle', 'Nasoni e fontanelle pubbliche: acqua fresca, pressione e posizione.', '⛲', 'sky'),
  ('Parchi', 'parchi', 'parchi', 'Prati, ombra, giochi e panchine dei parchi cittadini.', '🌳', 'emerald'),
  ('Spiagge', 'spiagge', 'spiagge', 'Sabbia, acqua, servizi e quanto è affollata ad agosto.', '🏖️', 'sky'),
  ('Treni regionali', 'treni-regionali', 'treni regionali', 'Puntualità, aria condizionata e posti a sedere.', '🚆', 'indigo'),
  ('Stazioni', 'stazioni', 'stazioni', 'Bagni, bar, tabelloni e senso di smarrimento.', '🚉', 'indigo'),
  ('Tramonti', 'tramonti', 'tramonti', 'I tramonti più belli, con luogo e ora consigliata.', '🌅', 'fuchsia'),
  ('Musei', 'musei', 'musei', 'Collezioni, code all''ingresso e qualità del bookshop.', '🏛️', 'violet'),
  ('Film', 'film', 'film', 'Sì, anche i film. Come Letterboxd, ma in mezzo ai tombini.', '🎬', 'rose'),
  ('Libri', 'libri', 'libri', 'Romanzi, saggi e fumetti letti di recente.', '📚', 'lime'),
  ('Videogiochi', 'videogiochi', 'videogiochi', 'Da quelli per telefono a quelli da 100 ore.', '🎮', 'fuchsia'),
  ('Album musicali', 'album-musicali', 'album musicali', 'Dischi da ascoltare dall''inizio alla fine.', '💿', 'violet'),
  ('Kebab', 'kebab', 'kebab', 'Carne, salse, pane e quanto regge alle due di notte.', '🥙', 'orange'),
  ('Birre', 'birre', 'birre', 'Artigianali o industriali, alla spina o in bottiglia.', '🍺', 'amber'),
  ('Parcheggi', 'parcheggi', 'parcheggi', 'Facilità, prezzo e quante volte hai girato in tondo.', '🅿️', 'teal'),
  ('Cani incontrati per strada', 'cani-incontrati-per-strada', 'cani incontrati per strada', 'Ogni cane merita una recensione (e di solito 5 stelle).', '🐕', 'lime')
ON CONFLICT (normalized_name) DO UPDATE
  SET icon = coalesce(public.categories.icon, excluded.icon),
      color = coalesce(public.categories.color, excluded.color),
      description = coalesce(public.categories.description, excluded.description);
