[
  {
    "schemaname": "public",
    "tablename": "admin_permissions",
    "policyname": "Enable read access for all users",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "admin_roles",
    "policyname": "Enable read access for all users",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "balanced_team_assignments",
    "policyname": "Enable delete access for authenticated users",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "balanced_team_assignments",
    "policyname": "Enable insert access for authenticated users",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "balanced_team_assignments",
    "policyname": "Enable read access for authenticated users",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "balanced_team_assignments",
    "policyname": "Enable update access for authenticated users",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "true",
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "game_registrations",
    "policyname": "Admins can register any player",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM players p\n  WHERE ((p.user_id = auth.uid()) AND ((p.is_admin = true) OR (p.is_super_admin = true)))))"
  },
  {
    "schemaname": "public",
    "tablename": "game_registrations",
    "policyname": "Enable insert for authenticated users",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((EXISTS ( SELECT 1\n   FROM players p\n  WHERE ((p.user_id = auth.uid()) AND (p.is_admin = true)))) OR (EXISTS ( SELECT 1\n   FROM players p\n  WHERE ((p.user_id = auth.uid()) AND (p.id = game_registrations.player_id)))))"
  },
  {
    "schemaname": "public",
    "tablename": "game_registrations",
    "policyname": "Enable read access for all users",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "game_registrations",
    "policyname": "Enable update for admins",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "((EXISTS ( SELECT 1\n   FROM ((players p\n     JOIN admin_roles ar ON ((ar.player_id = p.id)))\n     JOIN admin_permissions ap ON ((ap.admin_role_id = ar.id)))\n  WHERE ((p.user_id = auth.uid()) AND (ap.permission = 'manage_games'::text)))) OR (player_id = ( SELECT players.id\n   FROM players\n  WHERE (players.user_id = auth.uid()))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "game_registrations",
    "policyname": "Everyone can view game registrations",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "game_registrations",
    "policyname": "Players can delete their own registration",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "(auth.uid() IN ( SELECT players.user_id\n   FROM players\n  WHERE (players.id = game_registrations.player_id)))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "game_registrations",
    "policyname": "Players can register themselves",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(auth.uid() IN ( SELECT players.user_id\n   FROM players\n  WHERE (players.id = game_registrations.player_id)))"
  },
  {
    "schemaname": "public",
    "tablename": "game_registrations",
    "policyname": "Players can update their own registration",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() IN ( SELECT players.user_id\n   FROM players\n  WHERE (players.id = game_registrations.player_id)))",
    "with_check": "(auth.uid() IN ( SELECT players.user_id\n   FROM players\n  WHERE (players.id = game_registrations.player_id)))"
  },
  {
    "schemaname": "public",
    "tablename": "game_selections",
    "policyname": "Enable insert for authenticated users only",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(auth.role() = 'authenticated'::text)"
  },
  {
    "schemaname": "public",
    "tablename": "game_selections",
    "policyname": "Enable read access for all users",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "game_selections",
    "policyname": "Enable update for authenticated users only",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(auth.role() = 'authenticated'::text)",
    "with_check": "(auth.role() = 'authenticated'::text)"
  },
  {
    "schemaname": "public",
    "tablename": "games",
    "policyname": "Enable read access for all users",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "games",
    "policyname": "Everyone can view games",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "games",
    "policyname": "Only admins can delete games",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "(auth.uid() IN ( SELECT p.user_id\n   FROM players p\n  WHERE (p.is_admin = true)))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "games",
    "policyname": "Only admins can insert games",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(auth.uid() IN ( SELECT players.user_id\n   FROM players\n  WHERE (players.is_admin = true)))"
  },
  {
    "schemaname": "public",
    "tablename": "games",
    "policyname": "Only admins can update games",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() IN ( SELECT players.user_id\n   FROM players\n  WHERE (players.is_admin = true)))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "policyname": "Admins can create all notifications",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM (admin_roles ar\n     JOIN players p ON ((p.id = ar.player_id)))\n  WHERE (p.user_id = auth.uid())))"
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "policyname": "Admins can create notifications",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM (admin_roles ar\n     JOIN players p ON ((p.id = ar.player_id)))\n  WHERE (p.user_id = auth.uid())))"
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "policyname": "Admins can delete all notifications",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "(EXISTS ( SELECT 1\n   FROM (admin_roles ar\n     JOIN players p ON ((p.id = ar.player_id)))\n  WHERE (p.user_id = auth.uid())))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "policyname": "Admins can update all notifications",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(EXISTS ( SELECT 1\n   FROM (admin_roles ar\n     JOIN players p ON ((p.id = ar.player_id)))\n  WHERE (p.user_id = auth.uid())))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM (admin_roles ar\n     JOIN players p ON ((p.id = ar.player_id)))\n  WHERE (p.user_id = auth.uid())))"
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "policyname": "Admins can view all notifications",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM ((admin_roles ar\n     JOIN admin_permissions ap ON ((ap.admin_role_id = ar.id)))\n     JOIN players p ON ((p.id = ar.player_id)))\n  WHERE ((p.user_id = auth.uid()) AND (ap.permission = 'manage_games'::text))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "policyname": "Players can create notifications",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((auth.uid() IN ( SELECT players.user_id\n   FROM players\n  WHERE (players.id = notifications.player_id))) OR (EXISTS ( SELECT 1\n   FROM (admin_roles ar\n     JOIN players p ON ((p.id = ar.player_id)))\n  WHERE (p.user_id = auth.uid()))))"
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "policyname": "Players can create their own notifications",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(auth.uid() IN ( SELECT players.user_id\n   FROM players\n  WHERE (players.id = notifications.player_id)))"
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "policyname": "Players can delete their notifications",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "(auth.uid() IN ( SELECT players.user_id\n   FROM players\n  WHERE (players.id = notifications.player_id)))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "policyname": "Players can update their notifications",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() IN ( SELECT players.user_id\n   FROM players\n  WHERE (players.id = notifications.player_id)))",
    "with_check": "(auth.uid() IN ( SELECT players.user_id\n   FROM players\n  WHERE (players.id = notifications.player_id)))"
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "policyname": "Players can update their own notifications",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() IN ( SELECT players.user_id\n   FROM players\n  WHERE (players.id = notifications.player_id)))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "policyname": "Players can view their notifications",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "((auth.uid() IN ( SELECT players.user_id\n   FROM players\n  WHERE (players.id = notifications.player_id))) OR (EXISTS ( SELECT 1\n   FROM ((admin_roles ar\n     JOIN admin_permissions ap ON ((ap.admin_role_id = ar.id)))\n     JOIN players p ON ((p.id = ar.player_id)))\n  WHERE ((p.user_id = auth.uid()) AND (ap.permission = 'manage_games'::text)))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "policyname": "Players can view their own notifications",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() IN ( SELECT players.user_id\n   FROM players\n  WHERE (players.id = notifications.player_id)))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "policyname": "Service role can manage all notifications",
    "permissive": "PERMISSIVE",
    "roles": "{service_role}",
    "cmd": "ALL",
    "qual": "true",
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "policyname": "Service role can manage notifications",
    "permissive": "PERMISSIVE",
    "roles": "{service_role}",
    "cmd": "ALL",
    "qual": "true",
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "player_penalties",
    "policyname": "Players can add same-day dropout penalties to themselves",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((auth.uid() IN ( SELECT players.user_id\n   FROM players\n  WHERE (players.id = player_penalties.player_id))) AND (penalty_type = 'SAME_DAY_DROPOUT'::text))"
  },
  {
    "schemaname": "public",
    "tablename": "player_penalties",
    "policyname": "Players can view their own penalties",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() IN ( SELECT players.user_id\n   FROM players\n  WHERE (players.id = player_penalties.player_id)))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "player_ratings",
    "policyname": "Admins can see all ratings",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "((EXISTS ( SELECT 1\n   FROM players\n  WHERE ((players.id = player_ratings.rater_id) AND (players.user_id = auth.uid())))) OR (EXISTS ( SELECT 1\n   FROM players\n  WHERE ((players.user_id = auth.uid()) AND (players.is_admin = true)))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "player_ratings",
    "policyname": "Players can rate others they've played with",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM players\n  WHERE ((players.id = player_ratings.rater_id) AND (players.user_id = auth.uid()))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "players",
    "policyname": "Allow trigger function to update player ratings",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "true",
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "players",
    "policyname": "Enable read access for all users",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "players",
    "policyname": "Enable registration",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "players",
    "policyname": "Enable update for authenticated users",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(auth.role() = 'authenticated'::text)",
    "with_check": "(auth.role() = 'authenticated'::text)"
  },
  {
    "schemaname": "public",
    "tablename": "players",
    "policyname": "Super admins can delete players",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "(EXISTS ( SELECT 1\n   FROM players p\n  WHERE ((p.user_id = auth.uid()) AND (p.is_super_admin = true))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "players",
    "policyname": "Super admins can update any player",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(EXISTS ( SELECT 1\n   FROM players players_1\n  WHERE ((players_1.id = auth.uid()) AND (players_1.is_super_admin = true))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "players",
    "policyname": "Users can create their own player profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "players",
    "policyname": "Users can update their own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() = id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "registration_locks",
    "policyname": "Authenticated users can manage locks",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(auth.role() = 'authenticated'::text)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "reserve_xp_transactions",
    "policyname": "Admins can insert and update XP transactions",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM ((admin_roles ar\n     JOIN players p ON ((p.id = ar.player_id)))\n     JOIN admin_permissions ap ON ((ar.id = ap.admin_role_id)))\n  WHERE ((p.user_id = auth.uid()) AND (ap.permission = 'MANAGE_XP'::text))))"
  },
  {
    "schemaname": "public",
    "tablename": "reserve_xp_transactions",
    "policyname": "Admins can manage all XP transactions",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM ((admin_roles ar\n     JOIN players p ON ((p.id = ar.player_id)))\n     JOIN admin_permissions ap ON ((ar.id = ap.admin_role_id)))\n  WHERE ((p.user_id = auth.uid()) AND (ap.permission = 'MANAGE_XP'::text))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "reserve_xp_transactions",
    "policyname": "Admins can update XP transactions",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(EXISTS ( SELECT 1\n   FROM ((admin_roles ar\n     JOIN players p ON ((p.id = ar.player_id)))\n     JOIN admin_permissions ap ON ((ar.id = ap.admin_role_id)))\n  WHERE ((p.user_id = auth.uid()) AND (ap.permission = 'MANAGE_XP'::text))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "reserve_xp_transactions",
    "policyname": "Players can view their own XP transactions",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(auth.uid() IN ( SELECT players.user_id\n   FROM players\n  WHERE (players.id = reserve_xp_transactions.player_id)))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "slot_offers",
    "policyname": "Admins can manage slot offers",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM ((admin_permissions ap\n     JOIN admin_roles ar ON ((ap.admin_role_id = ar.id)))\n     JOIN players p ON ((p.id = ar.player_id)))\n  WHERE ((p.user_id = auth.uid()) AND (ap.permission = 'manage_games'::text))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM ((admin_permissions ap\n     JOIN admin_roles ar ON ((ap.admin_role_id = ar.id)))\n     JOIN players p ON ((p.id = ar.player_id)))\n  WHERE ((p.user_id = auth.uid()) AND (ap.permission = 'manage_games'::text))))"
  },
  {
    "schemaname": "public",
    "tablename": "slot_offers",
    "policyname": "Anyone can view all slot offers",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "slot_offers",
    "policyname": "Players can update their own slot offers",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(player_id IN ( SELECT players.id\n   FROM players\n  WHERE (players.user_id = auth.uid())))",
    "with_check": "(player_id IN ( SELECT players.id\n   FROM players\n  WHERE (players.user_id = auth.uid())))"
  },
  {
    "schemaname": "public",
    "tablename": "slot_offers",
    "policyname": "Players can view their own slot offers",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(player_id IN ( SELECT players.id\n   FROM players\n  WHERE (players.user_id = auth.uid())))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "team_announcement_locks",
    "policyname": "Authenticated users can manage team announcement locks",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(auth.role() = 'authenticated'::text)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "venue_presets",
    "policyname": "Allow admin write access",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM players\n  WHERE ((players.user_id = auth.uid()) AND (players.is_admin = true))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "venue_presets",
    "policyname": "Allow public read access",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  }
]