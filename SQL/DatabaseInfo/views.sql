
[
  {
    "viewname": "pg_stat_statements",
    "definition": " SELECT pg_stat_statements.userid,\n    pg_stat_statements.dbid,\n    pg_stat_statements.toplevel,\n    pg_stat_statements.queryid,\n    pg_stat_statements.query,\n    pg_stat_statements.plans,\n    pg_stat_statements.total_plan_time,\n    pg_stat_statements.min_plan_time,\n    pg_stat_statements.max_plan_time,\n    pg_stat_statements.mean_plan_time,\n    pg_stat_statements.stddev_plan_time,\n    pg_stat_statements.calls,\n    pg_stat_statements.total_exec_time,\n    pg_stat_statements.min_exec_time,\n    pg_stat_statements.max_exec_time,\n    pg_stat_statements.mean_exec_time,\n    pg_stat_statements.stddev_exec_time,\n    pg_stat_statements.rows,\n    pg_stat_statements.shared_blks_hit,\n    pg_stat_statements.shared_blks_read,\n    pg_stat_statements.shared_blks_dirtied,\n    pg_stat_statements.shared_blks_written,\n    pg_stat_statements.local_blks_hit,\n    pg_stat_statements.local_blks_read,\n    pg_stat_statements.local_blks_dirtied,\n    pg_stat_statements.local_blks_written,\n    pg_stat_statements.temp_blks_read,\n    pg_stat_statements.temp_blks_written,\n    pg_stat_statements.blk_read_time,\n    pg_stat_statements.blk_write_time,\n    pg_stat_statements.temp_blk_read_time,\n    pg_stat_statements.temp_blk_write_time,\n    pg_stat_statements.wal_records,\n    pg_stat_statements.wal_fpi,\n    pg_stat_statements.wal_bytes,\n    pg_stat_statements.jit_functions,\n    pg_stat_statements.jit_generation_time,\n    pg_stat_statements.jit_inlining_count,\n    pg_stat_statements.jit_inlining_time,\n    pg_stat_statements.jit_optimization_count,\n    pg_stat_statements.jit_optimization_time,\n    pg_stat_statements.jit_emission_count,\n    pg_stat_statements.jit_emission_time\n   FROM pg_stat_statements(true) pg_stat_statements(userid, dbid, toplevel, queryid, query, plans, total_plan_time, min_plan_time, max_plan_time, mean_plan_time, stddev_plan_time, calls, total_exec_time, min_exec_time, max_exec_time, mean_exec_time, stddev_exec_time, rows, shared_blks_hit, shared_blks_read, shared_blks_dirtied, shared_blks_written, local_blks_hit, local_blks_read, local_blks_dirtied, local_blks_written, temp_blks_read, temp_blks_written, blk_read_time, blk_write_time, temp_blk_read_time, temp_blk_write_time, wal_records, wal_fpi, wal_bytes, jit_functions, jit_generation_time, jit_inlining_count, jit_inlining_time, jit_optimization_count, jit_optimization_time, jit_emission_count, jit_emission_time);",
    "schemaname": "extensions"
  },
  {
    "viewname": "pg_stat_statements_info",
    "definition": " SELECT pg_stat_statements_info.dealloc,\n    pg_stat_statements_info.stats_reset\n   FROM pg_stat_statements_info() pg_stat_statements_info(dealloc, stats_reset);",
    "schemaname": "extensions"
  },
  {
    "viewname": "decrypted_key",
    "definition": " SELECT key.id,\n    key.status,\n    key.created,\n    key.expires,\n    key.key_type,\n    key.key_id,\n    key.key_context,\n    key.name,\n    key.associated_data,\n    key.raw_key,\n        CASE\n            WHEN (key.raw_key IS NULL) THEN NULL::bytea\n            ELSE\n            CASE\n                WHEN (key.parent_key IS NULL) THEN NULL::bytea\n                ELSE pgsodium.crypto_aead_det_decrypt(key.raw_key, convert_to(((key.id)::text || key.associated_data), 'utf8'::name), key.parent_key, key.raw_key_nonce)\n            END\n        END AS decrypted_raw_key,\n    key.raw_key_nonce,\n    key.parent_key,\n    key.comment\n   FROM pgsodium.key;",
    "schemaname": "pgsodium"
  },
  {
    "viewname": "mask_columns",
    "definition": " SELECT a.attname,\n    a.attrelid,\n    m.key_id,\n    m.key_id_column,\n    m.associated_columns,\n    m.nonce_column,\n    m.format_type\n   FROM (pg_attribute a\n     LEFT JOIN pgsodium.masking_rule m ON (((m.attrelid = a.attrelid) AND (m.attname = a.attname))))\n  WHERE ((a.attnum > 0) AND (NOT a.attisdropped))\n  ORDER BY a.attnum;",
    "schemaname": "pgsodium"
  },
  {
    "viewname": "masking_rule",
    "definition": " WITH const AS (\n         SELECT 'encrypt +with +key +id +([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'::text AS pattern_key_id,\n            'encrypt +with +key +column +([\\w\\\"\\-$]+)'::text AS pattern_key_id_column,\n            '(?<=associated) +\\(([\\w\\\"\\-$, ]+)\\)'::text AS pattern_associated_columns,\n            '(?<=nonce) +([\\w\\\"\\-$]+)'::text AS pattern_nonce_column,\n            '(?<=decrypt with view) +([\\w\\\"\\-$]+\\.[\\w\\\"\\-$]+)'::text AS pattern_view_name,\n            '(?<=security invoker)'::text AS pattern_security_invoker\n        ), rules_from_seclabels AS (\n         SELECT sl.objoid AS attrelid,\n            sl.objsubid AS attnum,\n            (c.relnamespace)::regnamespace AS relnamespace,\n            c.relname,\n            a.attname,\n            format_type(a.atttypid, a.atttypmod) AS format_type,\n            sl.label AS col_description,\n            (regexp_match(sl.label, k.pattern_key_id_column, 'i'::text))[1] AS key_id_column,\n            (regexp_match(sl.label, k.pattern_key_id, 'i'::text))[1] AS key_id,\n            (regexp_match(sl.label, k.pattern_associated_columns, 'i'::text))[1] AS associated_columns,\n            (regexp_match(sl.label, k.pattern_nonce_column, 'i'::text))[1] AS nonce_column,\n            COALESCE((regexp_match(sl2.label, k.pattern_view_name, 'i'::text))[1], (((c.relnamespace)::regnamespace || '.'::text) || quote_ident(('decrypted_'::text || (c.relname)::text)))) AS view_name,\n            100 AS priority,\n            ((regexp_match(sl.label, k.pattern_security_invoker, 'i'::text))[1] IS NOT NULL) AS security_invoker\n           FROM const k,\n            (((pg_seclabel sl\n             JOIN pg_class c ON (((sl.classoid = c.tableoid) AND (sl.objoid = c.oid))))\n             JOIN pg_attribute a ON (((a.attrelid = c.oid) AND (sl.objsubid = a.attnum))))\n             LEFT JOIN pg_seclabel sl2 ON (((sl2.objoid = c.oid) AND (sl2.objsubid = 0))))\n          WHERE ((a.attnum > 0) AND (((c.relnamespace)::regnamespace)::oid <> ('pg_catalog'::regnamespace)::oid) AND (NOT a.attisdropped) AND (sl.label ~~* 'ENCRYPT%'::text) AND (sl.provider = 'pgsodium'::text))\n        )\n SELECT DISTINCT ON (rules_from_seclabels.attrelid, rules_from_seclabels.attnum) rules_from_seclabels.attrelid,\n    rules_from_seclabels.attnum,\n    rules_from_seclabels.relnamespace,\n    rules_from_seclabels.relname,\n    rules_from_seclabels.attname,\n    rules_from_seclabels.format_type,\n    rules_from_seclabels.col_description,\n    rules_from_seclabels.key_id_column,\n    rules_from_seclabels.key_id,\n    rules_from_seclabels.associated_columns,\n    rules_from_seclabels.nonce_column,\n    rules_from_seclabels.view_name,\n    rules_from_seclabels.priority,\n    rules_from_seclabels.security_invoker\n   FROM rules_from_seclabels\n  ORDER BY rules_from_seclabels.attrelid, rules_from_seclabels.attnum, rules_from_seclabels.priority DESC;",
    "schemaname": "pgsodium"
  },
  {
    "viewname": "valid_key",
    "definition": " SELECT key.id,\n    key.name,\n    key.status,\n    key.key_type,\n    key.key_id,\n    key.key_context,\n    key.created,\n    key.expires,\n    key.associated_data\n   FROM pgsodium.key\n  WHERE ((key.status = ANY (ARRAY['valid'::pgsodium.key_status, 'default'::pgsodium.key_status])) AND\n        CASE\n            WHEN (key.expires IS NULL) THEN true\n            ELSE (key.expires > now())\n        END);",
    "schemaname": "pgsodium"
  },
  {
    "viewname": "extended_player_stats",
    "definition": " SELECT p.id,\n    p.friendly_name AS \"friendlyName\",\n    p.caps,\n    p.active_bonuses AS \"activeBonuses\",\n    p.active_penalties AS \"activePenalties\",\n    p.win_rate AS \"winRate\",\n    p.current_streak AS \"currentStreak\",\n    p.max_streak AS \"maxStreak\",\n    p.avatar_svg AS \"avatarSvg\",\n    px.xp,\n    array_agg(g.sequence_number ORDER BY g.date DESC) AS \"gameSequences\"\n   FROM (((players p\n     LEFT JOIN player_xp px ON ((p.id = px.player_id)))\n     LEFT JOIN game_registrations gr ON ((p.id = gr.player_id)))\n     LEFT JOIN games g ON (((gr.game_id = g.id) AND (g.completed = true))))\n  GROUP BY p.id, px.xp;",
    "schemaname": "public"
  },
  {
    "viewname": "player_ranks",
    "definition": " SELECT p.id,\n    p.friendly_name,\n    px.xp,\n    px.rank\n   FROM (players p\n     JOIN player_xp px ON ((p.id = px.player_id)))\n  WHERE (px.rank IS NOT NULL)\n  ORDER BY px.rank;",
    "schemaname": "public"
  },
  {
    "viewname": "player_stats",
    "definition": " SELECT p.id,\n    p.user_id,\n    p.friendly_name,\n    p.caps,\n    p.active_bonuses,\n    p.active_penalties,\n    p.win_rate,\n    p.attack_rating,\n    p.defense_rating,\n    p.avatar_svg,\n    p.avatar_options,\n    p.current_streak,\n    p.max_streak,\n    COALESCE(px.xp, 0) AS xp\n   FROM (players p\n     LEFT JOIN player_xp px ON ((p.id = px.player_id)));",
    "schemaname": "public"
  },
  {
    "viewname": "player_stats_with_xp",
    "definition": " SELECT ps.id,\n    ps.user_id,\n    ps.friendly_name,\n    ps.caps,\n    ps.active_bonuses,\n    ps.active_penalties,\n    ps.win_rate,\n    ps.attack_rating,\n    ps.defense_rating,\n    ps.avatar_svg,\n    ps.avatar_options,\n    ps.current_streak,\n    ps.max_streak,\n    COALESCE(px.xp, 0) AS xp\n   FROM (player_stats ps\n     LEFT JOIN player_xp px ON ((ps.user_id = px.player_id)));",
    "schemaname": "public"
  },
  {
    "viewname": "temp_selection_simulation",
    "definition": " WITH player_weights AS (\n         SELECT p.id,\n            p.friendly_name,\n            p.whatsapp_group_member,\n            p.bench_warmer_streak,\n            (1 + COALESCE(p.bench_warmer_streak, 0)) AS weight,\n                CASE\n                    WHEN (p.whatsapp_group_member = ANY (ARRAY['Yes'::text, 'Proxy'::text])) THEN 'WhatsApp'::text\n                    ELSE 'Non-WhatsApp'::text\n                END AS member_type\n           FROM players p\n          WHERE (p.is_test_user = false)\n        ), weight_totals AS (\n         SELECT player_weights.member_type,\n            sum(player_weights.weight) AS total_weight,\n            count(*) AS player_count\n           FROM player_weights\n          GROUP BY player_weights.member_type\n        )\n SELECT pw.id,\n    pw.friendly_name,\n    pw.whatsapp_group_member,\n    pw.bench_warmer_streak,\n    pw.weight,\n    pw.member_type,\n    round((((pw.weight)::numeric / (wt.total_weight)::numeric) * (100)::numeric), 2) AS selection_probability\n   FROM (player_weights pw\n     JOIN weight_totals wt ON ((pw.member_type = wt.member_type)))\n  ORDER BY pw.member_type, (round((((pw.weight)::numeric / (wt.total_weight)::numeric) * (100)::numeric), 2)) DESC;",
    "schemaname": "public"
  },
  {
    "viewname": "xp_comparison",
    "definition": " WITH game_sequences AS (\n         SELECT gr.player_id,\n            array_agg(g.sequence_number ORDER BY g.date DESC) AS sequences\n           FROM (game_registrations gr\n             JOIN games g ON ((gr.game_id = g.id)))\n          WHERE (g.completed = true)\n          GROUP BY gr.player_id\n        )\n SELECT p.id,\n    p.friendly_name,\n    p.caps,\n    p.active_bonuses,\n    p.active_penalties,\n    p.current_streak,\n    gs.sequences AS game_sequences,\n    COALESCE(px.xp, 0) AS database_xp,\n    p.caps AS frontend_caps,\n    p.active_bonuses AS frontend_bonuses,\n    p.active_penalties AS frontend_penalties,\n    p.current_streak AS frontend_streak\n   FROM ((players p\n     LEFT JOIN player_xp px ON ((p.id = px.player_id)))\n     LEFT JOIN game_sequences gs ON ((p.id = gs.player_id)))\n  WHERE (p.caps > 0)\n  ORDER BY p.friendly_name;",
    "schemaname": "public"
  },
  {
    "viewname": "decrypted_secrets",
    "definition": " SELECT secrets.id,\n    secrets.name,\n    secrets.description,\n    secrets.secret,\n        CASE\n            WHEN (secrets.secret IS NULL) THEN NULL::text\n            ELSE\n            CASE\n                WHEN (secrets.key_id IS NULL) THEN NULL::text\n                ELSE convert_from(pgsodium.crypto_aead_det_decrypt(decode(secrets.secret, 'base64'::text), convert_to(((((secrets.id)::text || secrets.description) || (secrets.created_at)::text) || (secrets.updated_at)::text), 'utf8'::name), secrets.key_id, secrets.nonce), 'utf8'::name)\n            END\n        END AS decrypted_secret,\n    secrets.key_id,\n    secrets.nonce,\n    secrets.created_at,\n    secrets.updated_at\n   FROM vault.secrets;",
    "schemaname": "vault"
  }
]