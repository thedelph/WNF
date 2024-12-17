-- Check current registration status for the game
SELECT 
    gr.id,
    gr.status,
    gr.team,
    p.friendly_name,
    g.status as game_status
FROM game_registrations gr
JOIN players p ON gr.player_id = p.id
JOIN games g ON gr.game_id = g.id
WHERE gr.game_id = '0efb6f33-0837-4f4b-a961-c5154b90d2e2'
ORDER BY gr.status, gr.team;
