CREATE TABLE public.platform_activity_visits (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 session_id uuid NOT NULL,
 page_path text NOT NULL,
 session_start boolean NOT NULL DEFAULT false,
 returning_visit boolean NOT NULL DEFAULT false,
 occurred_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_activity_visits TO authenticated;
GRANT ALL ON public.platform_activity_visits TO service_role;
ALTER TABLE public.platform_activity_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read activity visits" ON public.platform_activity_visits FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX platform_activity_visits_user_time ON public.platform_activity_visits (user_id, occurred_at DESC);
CREATE INDEX platform_activity_visits_time ON public.platform_activity_visits (occurred_at DESC);
CREATE OR REPLACE FUNCTION public.record_platform_visit(_page_path text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE previous public.platform_activity_visits; started boolean; sid uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 IF _page_path IS NULL OR length(_page_path)>250 OR _page_path NOT LIKE '/%' OR _page_path LIKE '%?%' OR _page_path LIKE '%#%' THEN RAISE EXCEPTION 'Invalid page path'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 42));
 SELECT * INTO previous FROM public.platform_activity_visits WHERE user_id=auth.uid() ORDER BY occurred_at DESC LIMIT 1;
 IF previous.id IS NOT NULL AND previous.occurred_at > now()-interval '30 seconds' AND previous.page_path=_page_path THEN RETURN; END IF;
 started := previous.id IS NULL OR previous.occurred_at <= now()-interval '30 minutes';
 sid := CASE WHEN started THEN gen_random_uuid() ELSE previous.session_id END;
 INSERT INTO public.platform_activity_visits(user_id,session_id,page_path,session_start,returning_visit) VALUES(auth.uid(),sid,_page_path,started,started AND previous.id IS NOT NULL);
END; $$;
REVOKE ALL ON FUNCTION public.record_platform_visit(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_platform_visit(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.admin_activity_log(_days integer DEFAULT 7, _user_id uuid DEFAULT NULL, _kind text DEFAULT 'all', _offset integer DEFAULT 0) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
 IF _days NOT IN (1,7,30,90) OR _kind NOT IN ('all','visit','click','event') THEN RAISE EXCEPTION 'Invalid filter'; END IF;
 WITH visits AS (SELECT * FROM public.platform_activity_visits WHERE occurred_at >= now()-make_interval(days=>_days)),
 combined AS (
 SELECT 'visit:'||id::text AS id,user_id,occurred_at,'visit'::text AS kind, CASE WHEN returning_visit THEN 'Returned to platform' WHEN session_start THEN 'Started visit' ELSE 'Viewed page' END AS action,page_path FROM visits
 UNION ALL SELECT 'click:'||id::text,user_id,created_at,'click',label,split_part(page_path,'?',1) FROM public.click_events WHERE user_id IS NOT NULL AND created_at>=now()-make_interval(days=>_days)
 UNION ALL SELECT 'event:'||event_id::text,actor_id,occurred_at,'event',coalesce(summary,replace(replace(event_type,'.',' '),'_',' ')),NULL FROM public.activity_stream WHERE actor_id IS NOT NULL AND visibility<>'hidden' AND occurred_at>=now()-make_interval(days=>_days)
 ), filtered AS (SELECT c.*,coalesce(p.full_name,'Unnamed user') AS user_name FROM combined c LEFT JOIN public.profiles p ON p.user_id=c.user_id WHERE (_user_id IS NULL OR c.user_id=_user_id) AND (_kind='all' OR c.kind=_kind)),
 people AS (SELECT c.user_id,coalesce(p.full_name,'Unnamed user') AS user_name,max(c.occurred_at) AS last_seen,count(*) AS actions, (SELECT count(*) FROM visits v WHERE v.user_id=c.user_id AND v.session_start) AS visits,(SELECT count(*) FROM visits v WHERE v.user_id=c.user_id AND v.returning_visit) AS returns FROM combined c LEFT JOIN public.profiles p ON p.user_id=c.user_id GROUP BY c.user_id,p.full_name)
 SELECT jsonb_build_object(
 'stats',jsonb_build_object('active_users',(SELECT count(*) FROM people),'returning_users',(SELECT count(*) FROM people WHERE returns>0),'visits',(SELECT count(*) FROM visits WHERE session_start),'actions',(SELECT count(*) FROM combined)),
 'users',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY last_seen DESC) FROM people p),'[]'::jsonb),
 'events',coalesce((SELECT jsonb_agg(to_jsonb(f) ORDER BY occurred_at DESC,id) FROM (SELECT * FROM filtered ORDER BY occurred_at DESC,id LIMIT 50 OFFSET greatest(0,least(_offset,100000))) f),'[]'::jsonb),
 'total',(SELECT count(*) FROM filtered),
 'tracking_since',(SELECT min(occurred_at) FROM public.platform_activity_visits)) INTO result;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.admin_activity_log(integer,uuid,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_activity_log(integer,uuid,text,integer) TO authenticated;
COMMENT ON TABLE public.platform_activity_visits IS 'Authenticated usage telemetry. Return visits start after 30 minutes without a recorded visit. No private content or query strings.';