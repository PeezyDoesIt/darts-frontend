-- Background placement is dragged now, not chosen from three stops.
--
-- player_background_position used to hold 'top' | 'center' | 'bottom'. The placer writes a
-- CSS percentage pair instead ("38% 61%"), which the throw screen already feeds straight to
-- background-position, so the old three values keep working untouched and no backfill is
-- needed. Only the zoom is new.

alter table public.players
  add column if not exists player_background_zoom integer;

comment on column public.players.player_background_position is
  'Where a cropped photo sits, as a CSS background-position. The placer writes a percentage pair such as ''38% 61%''; players saved before it hold ''top'', ''center'' or ''bottom''.';
comment on column public.players.player_background_zoom is
  'How far in the photo is pushed, 100-210 percent. Null is 100, i.e. no zoom.';
