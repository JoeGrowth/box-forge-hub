import { DashboardStats } from "@/components/dashboard/DashboardStats";

export default function Squares() {
  return (
    <section className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-6xl">
        <header className="mb-8">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            Your Squares
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            A snapshot of your signals across ventures, certifications and moves in play.
          </p>
        </header>
        <DashboardStats />
      </div>
    </section>
  );
}
