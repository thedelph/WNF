-- Check game registrations for the specific game
SELECT gr.id, gr.player_id, gr.team, gr.status, p.friendly_name
FROM game_registrations gr
JOIN players p ON gr.player_id = p.id
WHERE gr.game_id = '0efb6f33-0837-4f4b-a961-c5154b90d2e2'
AND gr.status = 'selected'
ORDER BY gr.team;

-- Check if there are any duplicate registrations
SELECT player_id, COUNT(*) as count
FROM game_registrations
WHERE game_id = '0efb6f33-0837-4f4b-a961-c5154b90d2e2'
GROUP BY player_id
HAVING COUNT(*) > 1;

-- Check game status and team announcement flag
SELECT id, status, teams_announced
FROM games
WHERE id = '0efb6f33-0837-4f4b-a961-c5154b90d2e2';
