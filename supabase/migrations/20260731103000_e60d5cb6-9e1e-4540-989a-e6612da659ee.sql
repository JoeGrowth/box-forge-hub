INSERT INTO public.distribution_entities (id, user_id, name)
VALUES ('thlu2sq', '1238d855-1904-41ce-a50c-ea549946e71e', 'JSFK')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.distribution_categories (id, user_id, entity_id, name)
VALUES
  ('taq4jzg', '1238d855-1904-41ce-a50c-ea549946e71e', 'thlu2sq', 'JSFK (1)'),
  ('ezjjw1d', '1238d855-1904-41ce-a50c-ea549946e71e', 'thlu2sq', 'ASF'),
  ('7ffloa8', '1238d855-1904-41ce-a50c-ea549946e71e', 'thlu2sq', 'ASF (1)')
ON CONFLICT (id) DO NOTHING;