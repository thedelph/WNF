-- 1. Check the game status and team announcement flag
SELECT id, status, teams_announced, date
FROM games 
WHERE id = '7573366d-a961-49dd-9d2c-fe0217ea167d';

-- 2. Check all registrations for selected players and their team assignments
SELECT 
    gr.id as registration_id,
    gr.player_id,
    gr.status,
    gr.team,
    p.friendly_name,
    g.status as game_status
FROM game_registrations gr
JOIN players p ON gr.player_id = p.id
JOIN games g ON gr.game_id = g.id
WHERE gr.game_id = '7573366d-a961-49dd-9d2c-fe0217ea167d'
AND gr.status = 'selected'
ORDER BY gr.team;

-- 3. Count players by team and status
SELECT 
    team,
    status,
    COUNT(*) as player_count
FROM game_registrations
WHERE game_id = '7573366d-a961-49dd-9d2c-fe0217ea167d'
GROUP BY team, status
ORDER BY team, status;

-- 4. Check for any NULL or invalid team assignments
SELECT 
    gr.id,
    gr.player_id,
    gr.status,
    gr.team,
    p.friendly_name
FROM game_registrations gr
JOIN players p ON gr.player_id = p.id
WHERE gr.game_id = '7573366d-a961-49dd-9d2c-fe0217ea167d'
AND gr.status = 'selected'
AND (gr.team IS NULL OR gr.team NOT IN ('blue', 'orange'));

-- 5. Check the full registration history for this game
SELECT 
    gr.id,
    gr.created_at,
    gr.status,
    gr.team,
    p.friendly_name
FROM game_registrations gr
JOIN players p ON gr.player_id = p.id
WHERE gr.game_id = '7573366d-a961-49dd-9d2c-fe0217ea167d'
ORDER BY gr.created_at DESC;
