CREATE OR REPLACE FUNCTION public.run_beta_simulation()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $func$
DECLARE
  uids uuid[] := ARRAY[
    '11111111-aaaa-4000-8000-000000000001'::uuid,'11111111-aaaa-4000-8000-000000000002',
    '11111111-bbbb-4000-8000-000000000003','11111111-bbbb-4000-8000-000000000004',
    '11111111-cccc-4000-8000-000000000005','11111111-cccc-4000-8000-000000000006',
    '11111111-dddd-4000-8000-000000000007','11111111-dddd-4000-8000-000000000008',
    '11111111-eeee-4000-8000-000000000009','11111111-ffff-4000-8000-000000000010'
  ];
  u uuid;
  v2 uuid := '22222222-2222-4000-8000-000000000002';
  v3 uuid := '22222222-3333-4000-8000-000000000003';
  -- Pre-computed bcrypt hash for an unusable password (sim users never log in).
  pw text := '$2a$10$abcdefghijklmnopqrstuvCdefghijklmnopqrstuvwxyzABCDEFGHIJKL';
BEGIN
  DELETE FROM public.startup_ideas WHERE id IN (v2, v3);
  DELETE FROM auth.users WHERE id = ANY(uids);

  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  SELECT uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'sim_'||substr(uid::text,1,8)||'@beta.local',
    pw,
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', 'Sim '||rn, 'role','cobuilder'),
    now(), now()
  FROM unnest(uids) WITH ORDINALITY AS t(uid, rn);

  INSERT INTO public.cold_start_profiles (user_id, decoder_result, estimated_expertise, confidence, seed_source) VALUES
    (uids[1], '{"src":"sim"}'::jsonb, '["Product Strategy","AI","Entrepreneurship"]'::jsonb, 0.5, 'compressed_onboarding'),
    (uids[2], '{"src":"sim"}'::jsonb, '["Sales","Marketing","Operations"]'::jsonb,           0.5, 'compressed_onboarding'),
    (uids[3], '{"src":"sim"}'::jsonb, '["Engineering","Data"]'::jsonb,                       0.6, 'compressed_onboarding'),
    (uids[4], '{"src":"sim"}'::jsonb, '["Design","Product Strategy"]'::jsonb,                0.6, 'compressed_onboarding'),
    (uids[5], '{"src":"sim"}'::jsonb, '["Product Strategy","AI","Consulting"]'::jsonb,       0.8, 'sim'),
    (uids[6], '{"src":"sim"}'::jsonb, '["Finance","Operations","Strategy"]'::jsonb,          0.8, 'sim'),
    (uids[7], '{"src":"sim"}'::jsonb, '["Consulting","Strategy","Finance"]'::jsonb,          0.9, 'sim'),
    (uids[8], '{"src":"sim"}'::jsonb, '["Training","Engineering","AI"]'::jsonb,              0.9, 'sim'),
    (uids[9], '{"src":"sim"}'::jsonb, '["Engineering","Product Strategy"]'::jsonb,           0.7, 'sim'),
    (uids[10],'{"src":"sim"}'::jsonb, '["Entrepreneurship","Product Strategy","Sales"]'::jsonb, 0.9, 'sim');

  FOREACH u IN ARRAY uids LOOP
    PERFORM public.seed_cold_start_expertise(u);
  END LOOP;

  INSERT INTO public.user_certifications (user_id, certification_type, display_label, verified, earned_at) VALUES
    (uids[3], 'idea_ptc',  'Vaccinated Initiator',  false, now()),
    (uids[4], 'skill_ptc', 'Vaccinated Co-Builder', false, now()),
    (uids[5], 'idea_ptc', 'Vaccinated Initiator',  true, now() - interval '14 days'),
    (uids[5], 'skill_ptc','Vaccinated Co-Builder', true, now() - interval '7 days'),
    (uids[5], 'nr_decoder','Natural Role Decoded', true, now() - interval '21 days'),
    (uids[6], 'idea_ptc', 'Vaccinated Initiator',  true, now() - interval '10 days'),
    (uids[6], 'skill_ptc','Vaccinated Co-Builder', true, now() - interval '5 days'),
    (uids[6], 'nr_decoder','Natural Role Decoded', true, now() - interval '15 days'),
    (uids[7], 'skill_ptc','Vaccinated Co-Builder', true, now() - interval '40 days'),
    (uids[7], 'idea_ptc', 'Vaccinated Initiator',  true, now() - interval '30 days'),
    (uids[8], 'skill_ptc','Vaccinated Co-Builder', true, now() - interval '60 days'),
    (uids[8], 'idea_ptc', 'Vaccinated Initiator',  true, now() - interval '45 days');

  PERFORM 1 FROM (
    WITH un AS (
      SELECT u_, public.graph_upsert_node('user'::graph_node_type, u_::text, NULL, '{}'::jsonb) nid
      FROM unnest(ARRAY[uids[5],uids[6],uids[7],uids[8]]) u_
    ),
    cn AS (
      SELECT u_, public.graph_upsert_node('certification'::graph_node_type,
                'sim_cert_'||u_::text||'_'||g, 'Sim Cert '||g, '{}'::jsonb) AS cnid
      FROM unnest(ARRAY[uids[5],uids[6],uids[7],uids[8]]) u_, generate_series(1,3) g
    )
    SELECT public.graph_upsert_edge(un.nid, cn.cnid,
            'HAS_CERTIFICATION'::graph_edge_type, 1.0,
            '{"verified":true}'::jsonb, NULL, now()) AS x
    FROM un JOIN cn ON cn.u_ = un.u_
  ) sub;

  PERFORM 1 FROM (
    WITH un AS (
      SELECT u_, public.graph_upsert_node('user'::graph_node_type, u_::text, NULL, '{}'::jsonb) nid
      FROM unnest(ARRAY[uids[7],uids[8]]) u_
    ),
    rn AS (
      SELECT u_, public.graph_upsert_node('review'::graph_node_type,
                'sim_rev_'||u_::text||'_'||g, 'rev', '{}'::jsonb) rnid
      FROM unnest(ARRAY[uids[7],uids[8]]) u_, generate_series(1,3) g
    )
    SELECT public.graph_upsert_edge(un.nid, rn.rnid,
            'USER_RECEIVED_REVIEW'::graph_edge_type, 1.0,
            jsonb_build_object('rating', 4.5), NULL, now()) AS x
    FROM un JOIN rn ON rn.u_ = un.u_
  ) sub;

  INSERT INTO public.transactions (id, buyer_id, seller_id, type, amount, currency, status, opportunity_id, opportunity_kind, completed_at, created_at)
  SELECT gen_random_uuid(), uids[1], uids[7], 'consulting', 1500, 'EUR', 'completed',
         'sim_op_a_'||g, 'consulting', now() - (g||' days')::interval, now() - ((g+1)||' days')::interval
  FROM generate_series(1,6) g
  UNION ALL
  SELECT gen_random_uuid(), uids[2], uids[8], 'training', 800, 'EUR', 'completed',
         'sim_op_b_'||g, 'training', now() - (g||' days')::interval, now() - ((g+1)||' days')::interval
  FROM generate_series(1,5) g;

  INSERT INTO public.graph_events (user_id, event_type, event_version, aggregate_type, aggregate_id,
    source_module, idempotency_key, payload, weight, occurred_at)
  SELECT t.seller_id, 'transaction_completed'::graph_event_type, 1, 'transaction', t.id::text,
         'simulation', 'sim_tx_completed:'||t.id::text,
         jsonb_build_object('transaction_id', t.id::text, 'amount', t.amount, 'seller_id', t.seller_id::text),
         1, t.completed_at
  FROM public.transactions t WHERE t.opportunity_id LIKE 'sim_op_%'
  ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;

  INSERT INTO public.startup_ideas (id, creator_id, title, description, sector, is_looking_for_cobuilders, review_status, created_at) VALUES
    (v2,  uids[10], 'Sim Venture: HealthTech AI', 'AI for patient triage. Looking for technical co-builder.', 'health', true, 'approved', now() - interval '5 days'),
    (v3,  uids[10], 'Sim Venture: CleanEnergy Marketplace', 'P2P marketplace for residential solar. Pre-seed.', 'energy', true, 'approved', now() - interval '20 days');

  INSERT INTO public.equity_allocations (id, venture_id, user_id, role, percentage, status, source, metadata) VALUES
    (gen_random_uuid(), v2,  uids[9],  public.derived_equity_role(8.0), 8.0,  'active', 'sim', '{"vesting_years":4}'::jsonb),
    (gen_random_uuid(), v2,  uids[10], 'FOUNDER',                       55.0, 'active', 'sim', '{"vesting_years":4}'::jsonb),
    (gen_random_uuid(), v3,  uids[10], 'FOUNDER',                       60.0, 'active', 'sim', '{"vesting_years":4}'::jsonb);

  INSERT INTO public.vesting_schedules (equity_allocation_id, total_percentage, vesting_months, cliff_months, frequency)
  SELECT ea.id, ea.percentage, 48, 12, 'monthly'
    FROM public.equity_allocations ea
   WHERE ea.source = 'sim'
     AND NOT EXISTS (SELECT 1 FROM public.vesting_schedules vs WHERE vs.equity_allocation_id = ea.id);

  INSERT INTO public.graph_events (user_id, event_type, event_version, aggregate_type, aggregate_id,
    source_module, idempotency_key, payload, weight, occurred_at)
  SELECT ea.user_id, 'equity_allocation_created'::graph_event_type, 1, 'equity_allocation', ea.id::text,
         'simulation', 'sim_equity_alloc:'||ea.id::text,
         jsonb_build_object('allocation_id', ea.id::text, 'venture_id', ea.venture_id::text,
                            'percentage', ea.percentage),
         1, now()
  FROM public.equity_allocations ea WHERE ea.source = 'sim'
  ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;

  FOREACH u IN ARRAY uids LOOP
    PERFORM public.recompute_expertise(u);
    PERFORM public.recompute_trust(u);
    PERFORM public.recompute_revenue(u);
    PERFORM public.recompute_ownership(u);
    PERFORM public.recompute_reputation(u);
    PERFORM public.recompute_opportunity_matches(u);
    PERFORM public.recompute_progression(u);
    PERFORM public.dispatch_growth_loops(u);
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'users', 10, 'ventures', 2);
END $func$;
REVOKE ALL ON FUNCTION public.run_beta_simulation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_beta_simulation() TO service_role;