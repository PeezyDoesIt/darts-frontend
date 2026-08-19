-- Framing for the two per-screen photos.
--
-- A player already had throw_background and walkup_background — separate pictures for the
-- board they aim at and the "you're up next" screen — but only one saved framing, on the
-- default photo, which every screen borrowed. That only works while the pictures are the
-- same. They usually are not: a face framed to clear the score on the throw screen sits
-- behind the name on the walk-up.
--
-- So each per-screen photo carries its own placement. Null means "use the default photo's
-- framing", which is exactly what happened before, so nothing needs backfilling and a player
-- who never opens the placer is unchanged.
--
-- Crop-or-fit and the fill behind a fitted photo stay player-wide and keep their existing
-- columns: they are how this player likes photos handled, not facts about one image.

alter table public.players
  add column if not exists throw_background_position text,
  add column if not exists throw_background_zoom integer,
  add column if not exists walkup_background_position text,
  add column if not exists walkup_background_zoom integer;

comment on column public.players.throw_background_position is
  'Where the throw screen''s own photo sits, as a CSS background-position percentage pair such as ''38% 61%''. Null falls back to player_background_position.';
comment on column public.players.throw_background_zoom is
  'How far in the throw screen''s own photo is pushed, 100-210 percent. Null falls back to player_background_zoom.';
comment on column public.players.walkup_background_position is
  'Where the walk-up screen''s own photo sits, as a CSS background-position percentage pair. Null falls back to player_background_position.';
comment on column public.players.walkup_background_zoom is
  'How far in the walk-up screen''s own photo is pushed, 100-210 percent. Null falls back to player_background_zoom.';
