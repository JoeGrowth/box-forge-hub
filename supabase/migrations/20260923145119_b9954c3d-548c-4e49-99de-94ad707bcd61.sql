UPDATE public.distribution_models AS model
SET tasks = corrected.tasks
FROM (
  SELECT dm.id,
         jsonb_agg(
           CASE
             WHEN lower(trim(task.item->>'label')) ~ '(structural reserve|rest structure|rest for the structure)'
               THEN task.item || jsonb_build_object('locked', true)
             ELSE task.item - 'locked'
           END
           ORDER BY task.ordinality
         ) AS tasks
  FROM public.distribution_models AS dm
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(dm.tasks, '[]'::jsonb)) WITH ORDINALITY AS task(item, ordinality)
  GROUP BY dm.id
) AS corrected
WHERE model.id = corrected.id
  AND model.tasks IS DISTINCT FROM corrected.tasks;

UPDATE public.distribution_records AS record
SET tasks = corrected.tasks
FROM (
  SELECT dr.id,
         jsonb_agg(
           CASE
             WHEN lower(trim(task.item->>'label')) ~ '(structural reserve|rest structure|rest for the structure)'
               THEN task.item || jsonb_build_object('locked', true)
             ELSE task.item - 'locked'
           END
           ORDER BY task.ordinality
         ) AS tasks
  FROM public.distribution_records AS dr
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(dr.tasks, '[]'::jsonb)) WITH ORDINALITY AS task(item, ordinality)
  GROUP BY dr.id
) AS corrected
WHERE record.id = corrected.id
  AND record.tasks IS DISTINCT FROM corrected.tasks;