-- Migration 075: Newlywed guessing game ("Who is most likely to…")
--
-- An async, no-auth party game. Guests open a shareable link, enter a name, and
-- guess an option per question (e.g. Helen vs Enrique). The couple sets the
-- correct answer for each question — some now, some after the ceremony ("first
-- to cry") — then ends the game to reveal results + the winning guest (the most
-- correct guesses). A question left without a correct answer at reveal simply
-- shows the crowd's most-picked option (unscored).
--
-- Tables: games → game_questions → game_options, plus game_players (identified
-- by a per-device token, so a guest can return to edit or see their score) and
-- game_answers (one pick per player + question).

CREATE TABLE IF NOT EXISTS games (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id   UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
  public_token TEXT UNIQUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_questions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id           UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  wedding_id        UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  prompt            TEXT NOT NULL,
  display_order     INTEGER NOT NULL DEFAULT 0,
  -- Nullable: the couple sets this now or after the wedding. FK added after
  -- game_options exists (mutual reference).
  correct_option_id UUID,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_options (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id   UUID NOT NULL REFERENCES game_questions(id) ON DELETE CASCADE,
  wedding_id    UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- A question's correct answer is one of its own options; if that option is
-- deleted, fall back to "not revealed yet" rather than a dangling reference.
-- Wrapped so a re-run (e.g. after a partial-apply retry) doesn't error on the
-- already-existing constraint — ADD CONSTRAINT has no IF NOT EXISTS form.
DO $$ BEGIN
  ALTER TABLE game_questions
    ADD CONSTRAINT game_questions_correct_option_fk
    FOREIGN KEY (correct_option_id) REFERENCES game_options(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS game_players (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id      UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  wedding_id   UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  -- Unguessable per-device token (cookie) so a guest can return to edit their
  -- answers while the game is open and see their own score once it closes.
  token        TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  UNIQUE (game_id, token)
);

CREATE TABLE IF NOT EXISTS game_answers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   UUID NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES game_questions(id) ON DELETE CASCADE,
  option_id   UUID NOT NULL REFERENCES game_options(id) ON DELETE CASCADE,
  wedding_id  UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (player_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_games_wedding_id ON games(wedding_id);
CREATE INDEX IF NOT EXISTS idx_game_questions_game_id ON game_questions(game_id);
CREATE INDEX IF NOT EXISTS idx_game_questions_wedding_id ON game_questions(wedding_id);
CREATE INDEX IF NOT EXISTS idx_game_options_question_id ON game_options(question_id);
CREATE INDEX IF NOT EXISTS idx_game_options_wedding_id ON game_options(wedding_id);
CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_game_players_wedding_id ON game_players(wedding_id);
CREATE INDEX IF NOT EXISTS idx_game_answers_player_id ON game_answers(player_id);
CREATE INDEX IF NOT EXISTS idx_game_answers_question_id ON game_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_game_answers_wedding_id ON game_answers(wedding_id);

-- Seed a starter game for Helen & Enrique with their example questions (options
-- Helen / Enrique, correct answers left blank to fill in later). Idempotent:
-- skips if the wedding already has a game.
DO $$
DECLARE
  w_id uuid;
  g_id uuid;
  q_id uuid;
  prompts text[] := ARRAY[
    'Who is the bigger clean freak?',
    'Who is the angry one?',
    'Who will cry first at the wedding?',
    'Who is the better dancer?',
    'Who said "I love you" first?',
    'Who is more likely to be running late?',
    'Who is the better cook?',
    'Who spends more time on their phone?',
    'Who is more competitive?',
    'Who is more likely to plan the next big trip?'
  ];
  i int;
BEGIN
  SELECT id INTO w_id FROM weddings WHERE slug = 'helen-and-enrique' LIMIT 1;
  IF w_id IS NULL THEN
    RAISE NOTICE 'Wedding "helen-and-enrique" not found; skipping game seed.';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM games WHERE wedding_id = w_id) THEN
    RAISE NOTICE 'A game already exists for this wedding; skipping game seed.';
    RETURN;
  END IF;

  INSERT INTO games (wedding_id, title, description, status, public_token)
  VALUES (
    w_id,
    'Helen or Enrique?',
    'Guess who''s most likely to… We''ll reveal the answers after the wedding and crown the guest who knows us best!',
    'open',
    replace(gen_random_uuid()::text, '-', '')
  )
  RETURNING id INTO g_id;

  FOR i IN 1 .. array_length(prompts, 1) LOOP
    INSERT INTO game_questions (game_id, wedding_id, prompt, display_order)
    VALUES (g_id, w_id, prompts[i], i)
    RETURNING id INTO q_id;

    INSERT INTO game_options (question_id, wedding_id, label, display_order) VALUES
      (q_id, w_id, 'Helen', 1),
      (q_id, w_id, 'Enrique', 2);
  END LOOP;

  RAISE NOTICE 'Seeded newlywed game % with % questions', g_id, array_length(prompts, 1);
END $$;
