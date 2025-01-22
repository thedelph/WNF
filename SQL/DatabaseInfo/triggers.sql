[
  {
    "trigger_name": "delete_payment_notification_on_verify",
    "table_name": "game_registrations",
    "trigger_definition": "CREATE TRIGGER delete_payment_notification_on_verify AFTER UPDATE ON public.game_registrations FOR EACH ROW EXECUTE FUNCTION delete_payment_request_notification()",
    "trigger_description": "Automatically deletes the payment_request notification when a game registration payment is verified by an admin"
  },
  {
    "trigger_name": "game_registration_bench_warmer_streak_update",
    "table_name": "game_registrations",
    "trigger_definition": "CREATE TRIGGER game_registration_bench_warmer_streak_update AFTER INSERT OR UPDATE ON public.game_registrations FOR EACH ROW EXECUTE FUNCTION update_bench_warmer_streak()",
    "trigger_description": null
  },
  {
    "trigger_name": "game_registration_xp_update",
    "table_name": "game_registrations",
    "trigger_definition": "CREATE TRIGGER game_registration_xp_update AFTER INSERT OR UPDATE ON public.game_registrations FOR EACH ROW EXECUTE FUNCTION handle_game_registration_xp()",
    "trigger_description": null
  },
  {
    "trigger_name": "update_streaks_on_registration",
    "table_name": "game_registrations",
    "trigger_definition": "CREATE TRIGGER update_streaks_on_registration AFTER INSERT OR UPDATE ON public.game_registrations FOR EACH ROW EXECUTE FUNCTION update_player_streaks()",
    "trigger_description": null
  },
  {
    "trigger_name": "update_unpaid_games_trigger",
    "table_name": "game_registrations",
    "trigger_definition": "CREATE TRIGGER update_unpaid_games_trigger AFTER INSERT OR UPDATE OF paid, payment_status ON public.game_registrations FOR EACH ROW EXECUTE FUNCTION update_player_unpaid_games()",
    "trigger_description": null
  },
  {
    "trigger_name": "game_completion_reserve_xp_trigger",
    "table_name": "games",
    "trigger_definition": "CREATE TRIGGER game_completion_reserve_xp_trigger AFTER UPDATE OF completed ON public.games FOR EACH ROW EXECUTE FUNCTION handle_game_completion_reserve_xp()",
    "trigger_description": null
  },
  {
    "trigger_name": "game_completion_status_check",
    "table_name": "games",
    "trigger_definition": "CREATE TRIGGER game_completion_status_check BEFORE UPDATE ON public.games FOR EACH ROW EXECUTE FUNCTION check_game_completion_status()",
    "trigger_description": null
  },
  {
    "trigger_name": "game_deletion_stats_update",
    "table_name": "games",
    "trigger_definition": "CREATE TRIGGER game_deletion_stats_update AFTER DELETE ON public.games FOR EACH ROW EXECUTE FUNCTION handle_game_deletion()",
    "trigger_description": null
  },
  {
    "trigger_name": "game_deletion_update",
    "table_name": "games",
    "trigger_definition": "CREATE TRIGGER game_deletion_update BEFORE DELETE ON public.games FOR EACH ROW EXECUTE FUNCTION handle_game_deletion()",
    "trigger_description": null
  },
  {
    "trigger_name": "game_deletion_xp_update",
    "table_name": "games",
    "trigger_definition": "CREATE TRIGGER game_deletion_xp_update BEFORE DELETE ON public.games FOR EACH ROW EXECUTE FUNCTION handle_game_deletion_xp()",
    "trigger_description": null
  },
  {
    "trigger_name": "game_sequence_delete",
    "table_name": "games",
    "trigger_definition": "CREATE TRIGGER game_sequence_delete AFTER DELETE ON public.games FOR EACH ROW EXECUTE FUNCTION update_game_sequence_numbers()",
    "trigger_description": null
  },
  {
    "trigger_name": "game_sequence_insert",
    "table_name": "games",
    "trigger_definition": "CREATE TRIGGER game_sequence_insert AFTER INSERT ON public.games FOR EACH ROW EXECUTE FUNCTION update_game_sequence_numbers()",
    "trigger_description": null
  },
  {
    "trigger_name": "game_sequence_update",
    "table_name": "games",
    "trigger_definition": "CREATE TRIGGER game_sequence_update AFTER UPDATE OF date ON public.games FOR EACH ROW WHEN ((old.date IS DISTINCT FROM new.date)) EXECUTE FUNCTION update_game_sequence_numbers()",
    "trigger_description": null
  },
  {
    "trigger_name": "game_streaks_update",
    "table_name": "games",
    "trigger_definition": "CREATE TRIGGER game_streaks_update AFTER DELETE OR UPDATE OF completed ON public.games FOR EACH STATEMENT EXECUTE FUNCTION update_streaks_on_game_change()",
    "trigger_description": null
  },
  {
    "trigger_name": "on_game_deletion",
    "table_name": "games",
    "trigger_definition": "CREATE TRIGGER on_game_deletion BEFORE DELETE ON public.games FOR EACH ROW EXECUTE FUNCTION handle_game_deletion()",
    "trigger_description": null
  },
  {
    "trigger_name": "set_game_needs_completion",
    "table_name": "games",
    "trigger_definition": "CREATE TRIGGER set_game_needs_completion BEFORE INSERT OR UPDATE ON public.games FOR EACH ROW EXECUTE FUNCTION update_game_needs_completion()",
    "trigger_description": null
  },
  {
    "trigger_name": "trigger_game_deletion",
    "table_name": "games",
    "trigger_definition": "CREATE TRIGGER trigger_game_deletion BEFORE DELETE ON public.games FOR EACH ROW EXECUTE FUNCTION handle_game_deletion()",
    "trigger_description": "Trigger to clean up slot offers and related notifications when a game is deleted"
  },
  {
    "trigger_name": "update_caps_on_game_completion",
    "table_name": "games",
    "trigger_definition": "CREATE TRIGGER update_caps_on_game_completion AFTER UPDATE ON public.games FOR EACH ROW EXECUTE FUNCTION update_player_caps_on_game_completion()",
    "trigger_description": null
  },
  {
    "trigger_name": "update_player_xp_on_game_completion",
    "table_name": "games",
    "trigger_definition": "CREATE TRIGGER update_player_xp_on_game_completion AFTER UPDATE ON public.games FOR EACH ROW EXECUTE FUNCTION update_player_xp()",
    "trigger_description": null
  },
  {
    "trigger_name": "update_streaks_on_game_change",
    "table_name": "games",
    "trigger_definition": "CREATE TRIGGER update_streaks_on_game_change AFTER UPDATE ON public.games FOR EACH ROW EXECUTE FUNCTION update_player_streaks()",
    "trigger_description": null
  },
  {
    "trigger_name": "update_win_rates_on_game_completion",
    "table_name": "games",
    "trigger_definition": "CREATE TRIGGER update_win_rates_on_game_completion AFTER UPDATE ON public.games FOR EACH ROW EXECUTE FUNCTION update_player_win_rates()",
    "trigger_description": null
  },
  {
    "trigger_name": "cron_job_cache_invalidate",
    "table_name": "job",
    "trigger_definition": "CREATE TRIGGER cron_job_cache_invalidate AFTER INSERT OR DELETE OR UPDATE OR TRUNCATE ON cron.job FOR EACH STATEMENT EXECUTE FUNCTION cron.job_cache_invalidate()",
    "trigger_description": null
  },
  {
    "trigger_name": "key_encrypt_secret_trigger_raw_key",
    "table_name": "key",
    "trigger_definition": "CREATE TRIGGER key_encrypt_secret_trigger_raw_key BEFORE INSERT OR UPDATE OF raw_key ON pgsodium.key FOR EACH ROW EXECUTE FUNCTION pgsodium.key_encrypt_secret_raw_key()",
    "trigger_description": null
  },
  {
    "trigger_name": "update_objects_updated_at",
    "table_name": "objects",
    "trigger_definition": "CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column()",
    "trigger_description": null
  },
  {
    "trigger_name": "update_player_ratings_timestamp",
    "table_name": "player_ratings",
    "trigger_definition": "CREATE TRIGGER update_player_ratings_timestamp BEFORE UPDATE ON public.player_ratings FOR EACH ROW EXECUTE FUNCTION update_updated_at()",
    "trigger_description": null
  },
  {
    "trigger_name": "update_player_ratings_trigger",
    "table_name": "player_ratings",
    "trigger_definition": "CREATE TRIGGER update_player_ratings_trigger AFTER INSERT OR DELETE OR UPDATE ON public.player_ratings FOR EACH ROW EXECUTE FUNCTION update_player_average_ratings()",
    "trigger_description": null
  },
  {
    "trigger_name": "player_ranks_update_trigger",
    "table_name": "player_xp",
    "trigger_definition": "CREATE TRIGGER player_ranks_update_trigger AFTER INSERT OR UPDATE OF xp ON public.player_xp FOR EACH STATEMENT EXECUTE FUNCTION update_player_ranks()",
    "trigger_description": null
  },
  {
    "trigger_name": "player_xp_rarity_trigger",
    "table_name": "player_xp",
    "trigger_definition": "CREATE TRIGGER player_xp_rarity_trigger AFTER INSERT OR UPDATE ON public.player_xp FOR EACH ROW EXECUTE FUNCTION update_rarity_on_xp_change()",
    "trigger_description": null
  },
  {
    "trigger_name": "player_streak_xp_update",
    "table_name": "players",
    "trigger_definition": "CREATE TRIGGER player_streak_xp_update AFTER UPDATE ON public.players FOR EACH ROW EXECUTE FUNCTION update_xp_on_streak_change()",
    "trigger_description": null
  },
  {
    "trigger_name": "update_xp_on_streak_change",
    "table_name": "players",
    "trigger_definition": "CREATE TRIGGER update_xp_on_streak_change AFTER UPDATE OF current_streak, bench_warmer_streak ON public.players FOR EACH ROW EXECUTE FUNCTION update_xp_on_streak_change()",
    "trigger_description": null
  },
  {
    "trigger_name": "reserve_xp_update_trigger",
    "table_name": "reserve_xp_transactions",
    "trigger_definition": "CREATE TRIGGER reserve_xp_update_trigger AFTER INSERT OR UPDATE ON public.reserve_xp_transactions FOR EACH ROW EXECUTE FUNCTION handle_reserve_xp_transaction()",
    "trigger_description": null
  },
  {
    "trigger_name": "secrets_encrypt_secret_trigger_secret",
    "table_name": "secrets",
    "trigger_definition": "CREATE TRIGGER secrets_encrypt_secret_trigger_secret BEFORE INSERT OR UPDATE OF secret ON vault.secrets FOR EACH ROW EXECUTE FUNCTION vault.secrets_encrypt_secret_secret()",
    "trigger_description": null
  },
  {
    "trigger_name": "slot_decline_penalty_trigger",
    "table_name": "slot_offers",
    "trigger_definition": "CREATE TRIGGER slot_decline_penalty_trigger AFTER UPDATE OF status ON public.slot_offers FOR EACH ROW EXECUTE FUNCTION handle_slot_decline_penalty()",
    "trigger_description": null
  },
  {
    "trigger_name": "slot_offer_response_trigger",
    "table_name": "slot_offers",
    "trigger_definition": "CREATE TRIGGER slot_offer_response_trigger BEFORE UPDATE ON public.slot_offers FOR EACH ROW EXECUTE FUNCTION handle_slot_offer_response()",
    "trigger_description": null
  },
  {
    "trigger_name": "tr_check_filters",
    "table_name": "subscription",
    "trigger_definition": "CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters()",
    "trigger_description": null
  }
]