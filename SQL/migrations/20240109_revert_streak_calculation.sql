-- Revoke execute permission from authenticated users
REVOKE EXECUTE ON FUNCTION public.get_player_attendance_streaks(integer) FROM authenticated;

-- Drop the function
DROP FUNCTION IF EXISTS public.get_player_attendance_streaks(integer);
