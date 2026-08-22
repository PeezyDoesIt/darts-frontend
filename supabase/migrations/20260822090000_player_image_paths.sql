-- Where each of a player's background photos lives in Storage.
--
-- Avatars have been in the `player-avatars` bucket since the storage work landed: the row
-- keeps `avatar_path` and the image itself sits in the bucket. The three background photos
-- were never wired into any of that. They are still base64 data URLs held inline — in
-- localStorage, and in these very text columns, at roughly 133% of the original file size,
-- crossing the wire in both directions on every sync. Each photo is paid for three times,
-- and backgrounds are the large ones: an avatar is a thumbnail, a background is full screen.
--
-- These columns give the three backgrounds the same durable reference the avatar already has.
--
-- Additive and nullable, so nothing needs backfilling here and an older build reading this
-- table is unaffected — it sees columns it does not select. The photos themselves move on
-- their own: a data URL arriving from the cloud is uploaded by the client, the path is
-- written here, and only then is the inline copy cleared. Nothing deletes an image it has
-- not already stored somewhere else.

alter table public.players
  add column if not exists player_background_path text,
  add column if not exists throw_background_path  text,
  add column if not exists walkup_background_path text;

comment on column public.players.player_background_path is
  'Path in the player-avatars bucket for the default background photo. Null means the image is still inline in player_background, or there is none.';
comment on column public.players.throw_background_path is
  'Path in the player-avatars bucket for the throw-screen background. Null means still inline, or none.';
comment on column public.players.walkup_background_path is
  'Path in the player-avatars bucket for the walk-up background. Null means still inline, or none.';
