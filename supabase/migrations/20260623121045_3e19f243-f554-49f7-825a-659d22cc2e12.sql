INSERT INTO public.event_catalog (event_type, event_version, source_module, description, deprecated)
VALUES
  ('onboarding_started', 1, 'compressed_onboarding', 'User started compressed onboarding', false),
  ('onboarding_step_completed', 1, 'compressed_onboarding', 'User completed one compressed onboarding step', false),
  ('onboarding_completed', 1, 'compressed_onboarding', 'User completed compressed onboarding', false),
  ('first_recommendations_viewed', 1, 'compressed_onboarding', 'User viewed first recommendations after onboarding', false),
  ('first_recommendation_clicked', 1, 'compressed_onboarding', 'User clicked a first recommendation after onboarding', false),
  ('cold_start_updated', 1, 'compressed_onboarding', 'User updated synthesized cold-start expertise during onboarding', false),
  ('activation_hub_viewed', 1, 'activation_hub', 'User viewed the activation hub', false),
  ('opportunity_interested', 1, 'activation_hub', 'User expressed interest in an opportunity from activation', false),
  ('nba_executed', 1, 'activation_hub', 'User executed a next best action from activation', false),
  ('signal_completed', 1, 'activation_hub', 'User completed a missing signal from activation', false),
  ('draft_generated', 1, 'ai_profile_draft', 'AI generated a profile draft', false),
  ('draft_viewed', 1, 'ai_profile_draft', 'User viewed an AI profile draft', false),
  ('draft_accepted', 1, 'ai_profile_draft', 'User accepted an AI profile draft', false),
  ('draft_edited', 1, 'ai_profile_draft', 'User edited an AI profile draft before saving', false),
  ('draft_regenerated', 1, 'ai_profile_draft', 'User requested profile draft regeneration', false),
  ('draft_dismissed', 1, 'ai_profile_draft', 'User dismissed an AI profile draft', false)
ON CONFLICT (event_type, event_version) DO UPDATE
SET source_module = EXCLUDED.source_module,
    description = EXCLUDED.description,
    deprecated = false;