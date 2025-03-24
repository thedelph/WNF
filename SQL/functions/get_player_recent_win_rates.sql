CREATE OR REPLACE FUNCTION get_player_recent_win_rates()
RETURNS TABLE (
  id UUID,
  friendly_name TEXT,
  recent_total_games BIGINT,
  recent_wins BIGINT,
  recent_draws BIGINT,
  recent_losses BIGINT,
  recent_win_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH player_recent_games AS (
    SELECT
      p.id AS player_id,
      p.friendly_name,
      gr.team AS player_team,
      g.outcome,
      g.score_blue,
      g.score_orange,
      ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY g.sequence_number DESC) AS row_num
    FROM
      players p
    JOIN
      game_registrations gr ON p.id = gr.player_id
    JOIN
      games g ON gr.game_id = g.id
    WHERE
      g.is_historical = TRUE
      AND g.needs_completion = FALSE
      AND g.completed = TRUE
      AND gr.status = 'selected'
      AND gr.team IN ('blue', 'orange')
  ),
  player_recent_stats AS (
    SELECT
      player_id,
      friendly_name,
      COUNT(*) AS total_games,
      SUM(CASE
          WHEN (player_team = 'blue' AND outcome = 'blue') OR (player_team = 'orange' AND outcome = 'orange') THEN 1
          ELSE 0
          END) AS wins,
      SUM(CASE
          WHEN outcome = 'draw' THEN 1
          ELSE 0
          END) AS draws,
      SUM(CASE
          WHEN (player_team = 'blue' AND outcome = 'orange') OR (player_team = 'orange' AND outcome = 'blue') THEN 1
          ELSE 0
          END) AS losses
    FROM
      player_recent_games
    WHERE
      row_num <= 10
    GROUP BY
      player_id, friendly_name
  )
  SELECT
    prs.player_id AS id,
    prs.friendly_name,
    prs.total_games AS recent_total_games,
    prs.wins AS recent_wins,
    prs.draws AS recent_draws,
    prs.losses AS recent_losses,
    CASE
      WHEN prs.total_games > 0 THEN ROUND(prs.wins * 100.0 / prs.total_games, 1)
      ELSE 0
    END AS recent_win_rate
  FROM
    player_recent_stats prs
  ORDER BY
    recent_win_rate DESC, recent_total_games DESC;
END;
$$ LANGUAGE plpgsql;
