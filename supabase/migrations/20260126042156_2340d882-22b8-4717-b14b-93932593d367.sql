-- Enable realtime for profiles and onboarding_state tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.onboarding_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_certifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.startup_ideas;