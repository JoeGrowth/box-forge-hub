import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function Squares() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <header className="mb-8">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Your Squares
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              A snapshot of your signals across ventures, certifications and moves in play.
            </p>
          </header>
        </div>
      </main>
      <Footer />
    </div>
  );
}
