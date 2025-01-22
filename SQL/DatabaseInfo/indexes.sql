[
  {
    "schema_name": "auth",
    "table_name": "audit_log_entries",
    "index_name": "audit_log_entries_pkey",
    "index_definition": "CREATE UNIQUE INDEX audit_log_entries_pkey ON auth.audit_log_entries USING btree (id)",
    "index_size": "72 kB"
  },
  {
    "schema_name": "auth",
    "table_name": "audit_log_entries",
    "index_name": "audit_logs_instance_id_idx",
    "index_definition": "CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "auth",
    "table_name": "flow_state",
    "index_name": "flow_state_created_at_idx",
    "index_definition": "CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "auth",
    "table_name": "flow_state",
    "index_name": "flow_state_pkey",
    "index_definition": "CREATE UNIQUE INDEX flow_state_pkey ON auth.flow_state USING btree (id)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "auth",
    "table_name": "flow_state",
    "index_name": "idx_auth_code",
    "index_definition": "CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "auth",
    "table_name": "flow_state",
    "index_name": "idx_user_id_auth_method",
    "index_definition": "CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "auth",
    "table_name": "identities",
    "index_name": "identities_email_idx",
    "index_definition": "CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "auth",
    "table_name": "identities",
    "index_name": "identities_pkey",
    "index_definition": "CREATE UNIQUE INDEX identities_pkey ON auth.identities USING btree (id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "auth",
    "table_name": "identities",
    "index_name": "identities_provider_id_provider_unique",
    "index_definition": "CREATE UNIQUE INDEX identities_provider_id_provider_unique ON auth.identities USING btree (provider_id, provider)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "auth",
    "table_name": "identities",
    "index_name": "identities_user_id_idx",
    "index_definition": "CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "auth",
    "table_name": "instances",
    "index_name": "instances_pkey",
    "index_definition": "CREATE UNIQUE INDEX instances_pkey ON auth.instances USING btree (id)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "auth",
    "table_name": "mfa_amr_claims",
    "index_name": "amr_id_pk",
    "index_definition": "CREATE UNIQUE INDEX amr_id_pk ON auth.mfa_amr_claims USING btree (id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "auth",
    "table_name": "mfa_amr_claims",
    "index_name": "mfa_amr_claims_session_id_authentication_method_pkey",
    "index_definition": "CREATE UNIQUE INDEX mfa_amr_claims_session_id_authentication_method_pkey ON auth.mfa_amr_claims USING btree (session_id, authentication_method)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "auth",
    "table_name": "mfa_challenges",
    "index_name": "mfa_challenge_created_at_idx",
    "index_definition": "CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "auth",
    "table_name": "mfa_challenges",
    "index_name": "mfa_challenges_pkey",
    "index_definition": "CREATE UNIQUE INDEX mfa_challenges_pkey ON auth.mfa_challenges USING btree (id)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "auth",
    "table_name": "mfa_factors",
    "index_name": "factor_id_created_at_idx",
    "index_definition": "CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "auth",
    "table_name": "mfa_factors",
    "index_name": "mfa_factors_last_challenged_at_key",
    "index_definition": "CREATE UNIQUE INDEX mfa_factors_last_challenged_at_key ON auth.mfa_factors USING btree (last_challenged_at)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "auth",
    "table_name": "mfa_factors",
    "index_name": "mfa_factors_pkey",
    "index_definition": "CREATE UNIQUE INDEX mfa_factors_pkey ON auth.mfa_factors USING btree (id)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "auth",
    "table_name": "mfa_factors",
    "index_name": "mfa_factors_user_friendly_name_unique",
    "index_definition": "CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "auth",
    "table_name": "mfa_factors",
    "index_name": "mfa_factors_user_id_idx",
    "index_definition": "CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "auth",
    "table_name": "mfa_factors",
    "index_name": "unique_phone_factor_per_user",
    "index_definition": "CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "auth",
    "table_name": "one_time_tokens",
    "index_name": "one_time_tokens_pkey",
    "index_definition": "CREATE UNIQUE INDEX one_time_tokens_pkey ON auth.one_time_tokens USING btree (id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "auth",
    "table_name": "one_time_tokens",
    "index_name": "one_time_tokens_relates_to_hash_idx",
    "index_definition": "CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to)",
    "index_size": "32 kB"
  },
  {
    "schema_name": "auth",
    "table_name": "one_time_tokens",
    "index_name": "one_time_tokens_token_hash_hash_idx",
    "index_definition": "CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash)",
    "index_size": "32 kB"
  },
  {
    "schema_name": "auth",
    "table_name": "one_time_tokens",
    "index_name": "one_time_tokens_user_id_token_type_key",
    "index_definition": "CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "auth",
    "table_name": "refresh_tokens",
    "index_name": "refresh_tokens_instance_id_idx",
    "index_definition": "CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "auth",
    "table_name": "refresh_tokens",
    "index_name": "refresh_tokens_instance_id_user_id_idx",
    "index_definition": "CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "auth",
    "table_name": "refresh_tokens",
    "index_name": "refresh_tokens_parent_idx",
    "index_definition": "CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "auth",
    "table_name": "refresh_tokens",
    "index_name": "refresh_tokens_pkey",
    "index_definition": "CREATE UNIQUE INDEX refresh_tokens_pkey ON auth.refresh_tokens USING btree (id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "auth",
    "table_name": "refresh_tokens",
    "index_name": "refresh_tokens_session_id_revoked_idx",
    "index_definition": "CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "auth",
    "table_name": "refresh_tokens",
    "index_name": "refresh_tokens_token_unique",
    "index_definition": "CREATE UNIQUE INDEX refresh_tokens_token_unique ON auth.refresh_tokens USING btree (token)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "auth",
    "table_name": "refresh_tokens",
    "index_name": "refresh_tokens_updated_at_idx",
    "index_definition": "CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "auth",
    "table_name": "saml_providers",
    "index_name": "saml_providers_entity_id_key",
    "index_definition": "CREATE UNIQUE INDEX saml_providers_entity_id_key ON auth.saml_providers USING btree (entity_id)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "auth",
    "table_name": "saml_providers",
    "index_name": "saml_providers_pkey",
    "index_definition": "CREATE UNIQUE INDEX saml_providers_pkey ON auth.saml_providers USING btree (id)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "auth",
    "table_name": "saml_providers",
    "index_name": "saml_providers_sso_provider_id_idx",
    "index_definition": "CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "auth",
    "table_name": "saml_relay_states",
    "index_name": "saml_relay_states_created_at_idx",
    "index_definition": "CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "auth",
    "table_name": "saml_relay_states",
    "index_name": "saml_relay_states_for_email_idx",
    "index_definition": "CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "auth",
    "table_name": "saml_relay_states",
    "index_name": "saml_relay_states_pkey",
    "index_definition": "CREATE UNIQUE INDEX saml_relay_states_pkey ON auth.saml_relay_states USING btree (id)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "auth",
    "table_name": "saml_relay_states",
    "index_name": "saml_relay_states_sso_provider_id_idx",
    "index_definition": "CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "auth",
    "table_name": "schema_migrations",
    "index_name": "schema_migrations_pkey",
    "index_definition": "CREATE UNIQUE INDEX schema_migrations_pkey ON auth.schema_migrations USING btree (version)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "auth",
    "table_name": "sessions",
    "index_name": "sessions_not_after_idx",
    "index_definition": "CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "auth",
    "table_name": "sessions",
    "index_name": "sessions_pkey",
    "index_definition": "CREATE UNIQUE INDEX sessions_pkey ON auth.sessions USING btree (id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "auth",
    "table_name": "sessions",
    "index_name": "sessions_user_id_idx",
    "index_definition": "CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "auth",
    "table_name": "sessions",
    "index_name": "user_id_created_at_idx",
    "index_definition": "CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "auth",
    "table_name": "sso_domains",
    "index_name": "sso_domains_domain_idx",
    "index_definition": "CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain))",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "auth",
    "table_name": "sso_domains",
    "index_name": "sso_domains_pkey",
    "index_definition": "CREATE UNIQUE INDEX sso_domains_pkey ON auth.sso_domains USING btree (id)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "auth",
    "table_name": "sso_domains",
    "index_name": "sso_domains_sso_provider_id_idx",
    "index_definition": "CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "auth",
    "table_name": "sso_providers",
    "index_name": "sso_providers_pkey",
    "index_definition": "CREATE UNIQUE INDEX sso_providers_pkey ON auth.sso_providers USING btree (id)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "auth",
    "table_name": "sso_providers",
    "index_name": "sso_providers_resource_id_idx",
    "index_definition": "CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id))",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "auth",
    "table_name": "users",
    "index_name": "confirmation_token_idx",
    "index_definition": "CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "auth",
    "table_name": "users",
    "index_name": "email_change_token_current_idx",
    "index_definition": "CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "auth",
    "table_name": "users",
    "index_name": "email_change_token_new_idx",
    "index_definition": "CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "auth",
    "table_name": "users",
    "index_name": "reauthentication_token_idx",
    "index_definition": "CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "auth",
    "table_name": "users",
    "index_name": "recovery_token_idx",
    "index_definition": "CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "auth",
    "table_name": "users",
    "index_name": "users_email_partial_key",
    "index_definition": "CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "auth",
    "table_name": "users",
    "index_name": "users_instance_id_email_idx",
    "index_definition": "CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text))",
    "index_size": "16 kB"
  },
  {
    "schema_name": "auth",
    "table_name": "users",
    "index_name": "users_instance_id_idx",
    "index_definition": "CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "auth",
    "table_name": "users",
    "index_name": "users_is_anonymous_idx",
    "index_definition": "CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "auth",
    "table_name": "users",
    "index_name": "users_phone_key",
    "index_definition": "CREATE UNIQUE INDEX users_phone_key ON auth.users USING btree (phone)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "auth",
    "table_name": "users",
    "index_name": "users_pkey",
    "index_definition": "CREATE UNIQUE INDEX users_pkey ON auth.users USING btree (id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "cron",
    "table_name": "job",
    "index_name": "job_pkey",
    "index_definition": "CREATE UNIQUE INDEX job_pkey ON cron.job USING btree (jobid)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "cron",
    "table_name": "job",
    "index_name": "jobname_username_uniq",
    "index_definition": "CREATE UNIQUE INDEX jobname_username_uniq ON cron.job USING btree (jobname, username)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "cron",
    "table_name": "job_run_details",
    "index_name": "job_run_details_pkey",
    "index_definition": "CREATE UNIQUE INDEX job_run_details_pkey ON cron.job_run_details USING btree (runid)",
    "index_size": "128 kB"
  },
  {
    "schema_name": "pgsodium",
    "table_name": "key",
    "index_name": "key_key_id_key_context_key_type_idx",
    "index_definition": "CREATE UNIQUE INDEX key_key_id_key_context_key_type_idx ON pgsodium.key USING btree (key_id, key_context, key_type)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "pgsodium",
    "table_name": "key",
    "index_name": "key_pkey",
    "index_definition": "CREATE UNIQUE INDEX key_pkey ON pgsodium.key USING btree (id)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "pgsodium",
    "table_name": "key",
    "index_name": "key_status_idx",
    "index_definition": "CREATE INDEX key_status_idx ON pgsodium.key USING btree (status) WHERE (status = ANY (ARRAY['valid'::pgsodium.key_status, 'default'::pgsodium.key_status]))",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "pgsodium",
    "table_name": "key",
    "index_name": "key_status_idx1",
    "index_definition": "CREATE UNIQUE INDEX key_status_idx1 ON pgsodium.key USING btree (status) WHERE (status = 'default'::pgsodium.key_status)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "pgsodium",
    "table_name": "key",
    "index_name": "pgsodium_key_unique_name",
    "index_definition": "CREATE UNIQUE INDEX pgsodium_key_unique_name ON pgsodium.key USING btree (name)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "public",
    "table_name": "admin_permissions",
    "index_name": "admin_permissions_pkey",
    "index_definition": "CREATE UNIQUE INDEX admin_permissions_pkey ON public.admin_permissions USING btree (id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "public",
    "table_name": "admin_permissions",
    "index_name": "unique_role_permission",
    "index_definition": "CREATE UNIQUE INDEX unique_role_permission ON public.admin_permissions USING btree (admin_role_id, permission)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "public",
    "table_name": "admin_roles",
    "index_name": "admin_roles_pkey",
    "index_definition": "CREATE UNIQUE INDEX admin_roles_pkey ON public.admin_roles USING btree (id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "public",
    "table_name": "admin_roles",
    "index_name": "unique_player_role",
    "index_definition": "CREATE UNIQUE INDEX unique_player_role ON public.admin_roles USING btree (player_id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "public",
    "table_name": "balanced_team_assignments",
    "index_name": "balanced_team_assignments_pkey",
    "index_definition": "CREATE UNIQUE INDEX balanced_team_assignments_pkey ON public.balanced_team_assignments USING btree (game_id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "public",
    "table_name": "debug_logs",
    "index_name": "debug_logs_pkey",
    "index_definition": "CREATE UNIQUE INDEX debug_logs_pkey ON public.debug_logs USING btree (id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "public",
    "table_name": "game_registrations",
    "index_name": "game_registrations_pkey",
    "index_definition": "CREATE UNIQUE INDEX game_registrations_pkey ON public.game_registrations USING btree (id)",
    "index_size": "56 kB"
  },
  {
    "schema_name": "public",
    "table_name": "game_registrations",
    "index_name": "idx_game_registrations_game_status",
    "index_definition": "CREATE INDEX idx_game_registrations_game_status ON public.game_registrations USING btree (game_id, status)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "public",
    "table_name": "game_registrations",
    "index_name": "unique_game_player",
    "index_definition": "CREATE UNIQUE INDEX unique_game_player ON public.game_registrations USING btree (game_id, player_id)",
    "index_size": "88 kB"
  },
  {
    "schema_name": "public",
    "table_name": "game_selections",
    "index_name": "game_selections_pkey",
    "index_definition": "CREATE UNIQUE INDEX game_selections_pkey ON public.game_selections USING btree (id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "public",
    "table_name": "games",
    "index_name": "games_pkey",
    "index_definition": "CREATE UNIQUE INDEX games_pkey ON public.games USING btree (id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "public",
    "table_name": "notifications",
    "index_name": "notifications_pkey",
    "index_definition": "CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "public",
    "table_name": "payment_presets",
    "index_name": "payment_presets_pkey",
    "index_definition": "CREATE UNIQUE INDEX payment_presets_pkey ON public.payment_presets USING btree (id)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "public",
    "table_name": "player_penalties",
    "index_name": "player_penalties_pkey",
    "index_definition": "CREATE UNIQUE INDEX player_penalties_pkey ON public.player_penalties USING btree (id)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "public",
    "table_name": "player_penalties",
    "index_name": "player_penalties_player_id_game_id_penalty_type_key",
    "index_definition": "CREATE UNIQUE INDEX player_penalties_player_id_game_id_penalty_type_key ON public.player_penalties USING btree (player_id, game_id, penalty_type)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "public",
    "table_name": "player_ratings",
    "index_name": "player_ratings_pkey",
    "index_definition": "CREATE UNIQUE INDEX player_ratings_pkey ON public.player_ratings USING btree (id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "public",
    "table_name": "player_ratings",
    "index_name": "unique_rating_pair",
    "index_definition": "CREATE UNIQUE INDEX unique_rating_pair ON public.player_ratings USING btree (rater_id, rated_player_id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "public",
    "table_name": "player_xp",
    "index_name": "player_xp_pkey",
    "index_definition": "CREATE UNIQUE INDEX player_xp_pkey ON public.player_xp USING btree (player_id)",
    "index_size": "88 kB"
  },
  {
    "schema_name": "public",
    "table_name": "players",
    "index_name": "players_friendly_name_idx",
    "index_definition": "CREATE INDEX players_friendly_name_idx ON public.players USING btree (friendly_name)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "public",
    "table_name": "players",
    "index_name": "players_friendly_name_test_unique",
    "index_definition": "CREATE UNIQUE INDEX players_friendly_name_test_unique ON public.players USING btree (friendly_name, is_test_user)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "public",
    "table_name": "players",
    "index_name": "players_pkey",
    "index_definition": "CREATE UNIQUE INDEX players_pkey ON public.players USING btree (id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "public",
    "table_name": "players",
    "index_name": "players_user_id_idx",
    "index_definition": "CREATE INDEX players_user_id_idx ON public.players USING btree (user_id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "public",
    "table_name": "registration_locks",
    "index_name": "idx_registration_locks_game_id",
    "index_definition": "CREATE INDEX idx_registration_locks_game_id ON public.registration_locks USING btree (game_id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "public",
    "table_name": "registration_locks",
    "index_name": "registration_locks_game_id_key",
    "index_definition": "CREATE UNIQUE INDEX registration_locks_game_id_key ON public.registration_locks USING btree (game_id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "public",
    "table_name": "registration_locks",
    "index_name": "registration_locks_pkey",
    "index_definition": "CREATE UNIQUE INDEX registration_locks_pkey ON public.registration_locks USING btree (id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "public",
    "table_name": "reserve_xp_transactions",
    "index_name": "idx_reserve_xp_transactions_player_game",
    "index_definition": "CREATE INDEX idx_reserve_xp_transactions_player_game ON public.reserve_xp_transactions USING btree (player_id, game_id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "public",
    "table_name": "reserve_xp_transactions",
    "index_name": "reserve_xp_transactions_created_at_idx",
    "index_definition": "CREATE INDEX reserve_xp_transactions_created_at_idx ON public.reserve_xp_transactions USING btree (created_at)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "public",
    "table_name": "reserve_xp_transactions",
    "index_name": "reserve_xp_transactions_pkey",
    "index_definition": "CREATE UNIQUE INDEX reserve_xp_transactions_pkey ON public.reserve_xp_transactions USING btree (id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "public",
    "table_name": "reserve_xp_transactions",
    "index_name": "reserve_xp_transactions_player_game_idx",
    "index_definition": "CREATE INDEX reserve_xp_transactions_player_game_idx ON public.reserve_xp_transactions USING btree (player_id, game_id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "public",
    "table_name": "reserve_xp_transactions",
    "index_name": "reserve_xp_transactions_player_id_game_id_transaction_type_key",
    "index_definition": "CREATE UNIQUE INDEX reserve_xp_transactions_player_id_game_id_transaction_type_key ON public.reserve_xp_transactions USING btree (player_id, game_id, transaction_type)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "public",
    "table_name": "slot_offers",
    "index_name": "idx_slot_offers_game_player",
    "index_definition": "CREATE INDEX idx_slot_offers_game_player ON public.slot_offers USING btree (game_id, player_id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "public",
    "table_name": "slot_offers",
    "index_name": "slot_offers_game_id_player_id_status_key",
    "index_definition": "CREATE UNIQUE INDEX slot_offers_game_id_player_id_status_key ON public.slot_offers USING btree (game_id, player_id, status)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "public",
    "table_name": "slot_offers",
    "index_name": "slot_offers_pkey",
    "index_definition": "CREATE UNIQUE INDEX slot_offers_pkey ON public.slot_offers USING btree (id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "public",
    "table_name": "team_announcement_locks",
    "index_name": "idx_team_announcement_locks_game_id",
    "index_definition": "CREATE INDEX idx_team_announcement_locks_game_id ON public.team_announcement_locks USING btree (game_id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "public",
    "table_name": "team_announcement_locks",
    "index_name": "team_announcement_locks_game_id_key",
    "index_definition": "CREATE UNIQUE INDEX team_announcement_locks_game_id_key ON public.team_announcement_locks USING btree (game_id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "public",
    "table_name": "team_announcement_locks",
    "index_name": "team_announcement_locks_pkey",
    "index_definition": "CREATE UNIQUE INDEX team_announcement_locks_pkey ON public.team_announcement_locks USING btree (id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "public",
    "table_name": "venue_presets",
    "index_name": "venue_presets_pkey",
    "index_definition": "CREATE UNIQUE INDEX venue_presets_pkey ON public.venue_presets USING btree (id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "public",
    "table_name": "venues",
    "index_name": "venues_pkey",
    "index_definition": "CREATE UNIQUE INDEX venues_pkey ON public.venues USING btree (id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "realtime",
    "table_name": "messages",
    "index_name": "messages_pkey",
    "index_definition": "CREATE UNIQUE INDEX messages_pkey ON ONLY realtime.messages USING btree (id, inserted_at)",
    "index_size": "0 bytes"
  },
  {
    "schema_name": "realtime",
    "table_name": "messages_2025_01_15",
    "index_name": "messages_2025_01_15_pkey",
    "index_definition": "CREATE UNIQUE INDEX messages_2025_01_15_pkey ON realtime.messages_2025_01_15 USING btree (id, inserted_at)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "realtime",
    "table_name": "messages_2025_01_16",
    "index_name": "messages_2025_01_16_pkey",
    "index_definition": "CREATE UNIQUE INDEX messages_2025_01_16_pkey ON realtime.messages_2025_01_16 USING btree (id, inserted_at)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "realtime",
    "table_name": "messages_2025_01_17",
    "index_name": "messages_2025_01_17_pkey",
    "index_definition": "CREATE UNIQUE INDEX messages_2025_01_17_pkey ON realtime.messages_2025_01_17 USING btree (id, inserted_at)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "realtime",
    "table_name": "messages_2025_01_18",
    "index_name": "messages_2025_01_18_pkey",
    "index_definition": "CREATE UNIQUE INDEX messages_2025_01_18_pkey ON realtime.messages_2025_01_18 USING btree (id, inserted_at)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "realtime",
    "table_name": "messages_2025_01_19",
    "index_name": "messages_2025_01_19_pkey",
    "index_definition": "CREATE UNIQUE INDEX messages_2025_01_19_pkey ON realtime.messages_2025_01_19 USING btree (id, inserted_at)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "realtime",
    "table_name": "messages_2025_01_20",
    "index_name": "messages_2025_01_20_pkey",
    "index_definition": "CREATE UNIQUE INDEX messages_2025_01_20_pkey ON realtime.messages_2025_01_20 USING btree (id, inserted_at)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "realtime",
    "table_name": "messages_2025_01_21",
    "index_name": "messages_2025_01_21_pkey",
    "index_definition": "CREATE UNIQUE INDEX messages_2025_01_21_pkey ON realtime.messages_2025_01_21 USING btree (id, inserted_at)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "realtime",
    "table_name": "messages_2025_01_22",
    "index_name": "messages_2025_01_22_pkey",
    "index_definition": "CREATE UNIQUE INDEX messages_2025_01_22_pkey ON realtime.messages_2025_01_22 USING btree (id, inserted_at)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "realtime",
    "table_name": "messages_2025_01_23",
    "index_name": "messages_2025_01_23_pkey",
    "index_definition": "CREATE UNIQUE INDEX messages_2025_01_23_pkey ON realtime.messages_2025_01_23 USING btree (id, inserted_at)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "realtime",
    "table_name": "messages_2025_01_24",
    "index_name": "messages_2025_01_24_pkey",
    "index_definition": "CREATE UNIQUE INDEX messages_2025_01_24_pkey ON realtime.messages_2025_01_24 USING btree (id, inserted_at)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "realtime",
    "table_name": "messages_2025_01_25",
    "index_name": "messages_2025_01_25_pkey",
    "index_definition": "CREATE UNIQUE INDEX messages_2025_01_25_pkey ON realtime.messages_2025_01_25 USING btree (id, inserted_at)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "realtime",
    "table_name": "schema_migrations",
    "index_name": "schema_migrations_pkey",
    "index_definition": "CREATE UNIQUE INDEX schema_migrations_pkey ON realtime.schema_migrations USING btree (version)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "realtime",
    "table_name": "subscription",
    "index_name": "ix_realtime_subscription_entity",
    "index_definition": "CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "realtime",
    "table_name": "subscription",
    "index_name": "pk_subscription",
    "index_definition": "CREATE UNIQUE INDEX pk_subscription ON realtime.subscription USING btree (id)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "realtime",
    "table_name": "subscription",
    "index_name": "subscription_subscription_id_entity_filters_key",
    "index_definition": "CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_key ON realtime.subscription USING btree (subscription_id, entity, filters)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "storage",
    "table_name": "buckets",
    "index_name": "bname",
    "index_definition": "CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "storage",
    "table_name": "buckets",
    "index_name": "buckets_pkey",
    "index_definition": "CREATE UNIQUE INDEX buckets_pkey ON storage.buckets USING btree (id)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "storage",
    "table_name": "migrations",
    "index_name": "migrations_name_key",
    "index_definition": "CREATE UNIQUE INDEX migrations_name_key ON storage.migrations USING btree (name)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "storage",
    "table_name": "migrations",
    "index_name": "migrations_pkey",
    "index_definition": "CREATE UNIQUE INDEX migrations_pkey ON storage.migrations USING btree (id)",
    "index_size": "16 kB"
  },
  {
    "schema_name": "storage",
    "table_name": "objects",
    "index_name": "bucketid_objname",
    "index_definition": "CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "storage",
    "table_name": "objects",
    "index_name": "idx_objects_bucket_id_name",
    "index_definition": "CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE \"C\")",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "storage",
    "table_name": "objects",
    "index_name": "name_prefix_search",
    "index_definition": "CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "storage",
    "table_name": "objects",
    "index_name": "objects_pkey",
    "index_definition": "CREATE UNIQUE INDEX objects_pkey ON storage.objects USING btree (id)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "storage",
    "table_name": "s3_multipart_uploads",
    "index_name": "idx_multipart_uploads_list",
    "index_definition": "CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "storage",
    "table_name": "s3_multipart_uploads",
    "index_name": "s3_multipart_uploads_pkey",
    "index_definition": "CREATE UNIQUE INDEX s3_multipart_uploads_pkey ON storage.s3_multipart_uploads USING btree (id)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "storage",
    "table_name": "s3_multipart_uploads_parts",
    "index_name": "s3_multipart_uploads_parts_pkey",
    "index_definition": "CREATE UNIQUE INDEX s3_multipart_uploads_parts_pkey ON storage.s3_multipart_uploads_parts USING btree (id)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "vault",
    "table_name": "secrets",
    "index_name": "secrets_name_idx",
    "index_definition": "CREATE UNIQUE INDEX secrets_name_idx ON vault.secrets USING btree (name) WHERE (name IS NOT NULL)",
    "index_size": "8192 bytes"
  },
  {
    "schema_name": "vault",
    "table_name": "secrets",
    "index_name": "secrets_pkey",
    "index_definition": "CREATE UNIQUE INDEX secrets_pkey ON vault.secrets USING btree (id)",
    "index_size": "8192 bytes"
  }
]