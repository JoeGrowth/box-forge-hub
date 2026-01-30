import { useAuth } from "@/hooks/useAuth";
import Landing from "./Landing";
import Dashboard from "./Dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Navbar } from "@/components/layout/Navbar";

const Index = () => {
  const { user, loading } = useAuth();

  // Show loading state while auth is being determined
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-24">
          <div className="space-y-4 w-full max-w-md px-4">
            <Skeleton className="h-12 w-3/4 mx-auto" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-5/6 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  // Show Dashboard for logged-in users, Landing for guests
  return user ? <Dashboard /> : <Landing />;
};

export default Index;
