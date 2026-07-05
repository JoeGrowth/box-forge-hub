import { useAuth } from "@/hooks/useAuth";
import Landing from "./Landing";
import Dashboard from "./Dashboard";

const Index = () => {
  const { user, loading } = useAuth();

  // While auth is resolving, keep the background stable instead of rendering
  // a Navbar+skeleton that would flash and then be replaced by a different
  // Landing / Dashboard layout. Sync-hydrated auth usually means we never
  // hit this branch, but it's kept as a safety net.
  if (loading) {
    return <div className="min-h-screen bg-background" aria-hidden />;
  }

  return user ? <Dashboard /> : <Landing />;
};

export default Index;
