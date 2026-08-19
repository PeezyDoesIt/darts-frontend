-- Which ink a player's Yahtzee card is printed in.
--
-- Three skins ship together — Street Print, Paper Card, Board Flip — chosen on the player's
-- profile beside the dice theme. Null means Street, which is the app's own look and what every
-- existing player already sees, so there is nothing to backfill.
--
-- Text rather than an enum: the set is a design decision and will move again, and widening a
-- Postgres enum needs a migration where widening a check-free text column needs nothing. The
-- app resolves anything it does not recognise to Street, so an old build reading a newer value
-- draws a card rather than an empty one.

alter table public.players
  add column if not exists yahtzee_card text;

comment on column public.players.yahtzee_card is
  'Yahtzee scorecard ink: ''street'' (default), ''paper'' or ''board''. Null means street.';
