import { useAuth } from "@/hooks/useAuth";
import Landing from "./Landing";
import Dashboard from "./Dashboard";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md px-4">
          <Skeleton className="h-12 w-3/4 mx-auto" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-5/6 mx-auto" />
        </div>
      </div>
    );
  }

  // Show Dashboard for logged-in users, Landing for guests
  return user ? <Dashboard /> : <Landing />;
};

export default Index;
