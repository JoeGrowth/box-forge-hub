import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { BookOpen, Loader2, Users, Lightbulb, Briefcase, Play, CheckCircle2, Clock, Trophy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";

interface LearningPath {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  modules: number;
  quizzes: number;
  duration: string;
  color: string;
  gradient: string;
  skills: string[];
}

const learningPaths: LearningPath[] = [
  {
    id: "initiator",
    title: "Learn to be an Initiator",
    subtitle: "Idea to Launch",
    description: "Master the art of transforming ideas into actionable startup plans. Learn ideation, validation, and team building.",
    icon: <Lightbulb className="w-8 h-8" />,
    modules: 4,
    quizzes: 12,
    duration: "4-6 weeks",
    color: "text-amber-500",
    gradient: "from-amber-500/20 to-orange-500/20",
    skills: ["Ideation", "Market Validation", "Business Model", "Team Building"]
  },
  {
    id: "cobuilder",
    title: "Learn to be a Co-Builder",
    subtitle: "Skill Mastery",
    description: "Develop the core competencies needed to contribute effectively to startup teams and build your portfolio.",
    icon: <Users className="w-8 h-8" />,
    modules: 3,
    quizzes: 9,
    duration: "3-4 weeks",
    color: "text-secondary",
    gradient: "from-secondary/20 to-primary/20",
    skills: ["Practice", "Train", "Consult"]
  },
  {
    id: "consultant",
    title: "Learn to be a Consultant",
    subtitle: "Advisory Excellence",
    description: "Elevate your expertise to guide startups strategically. Learn consulting frameworks and client management.",
    icon: <Briefcase className="w-8 h-8" />,
    modules: 5,
    quizzes: 15,
    duration: "6-8 weeks",
    color: "text-purple-500",
    gradient: "from-purple-500/20 to-indigo-500/20",
    skills: ["Strategy", "Advisory", "Client Relations", "Problem Solving", "Leadership"]
  }
];

const Journey = () => {
  const { user, loading: authLoading } = useAuth();
  const { loading: onboardingLoading } = useOnboarding();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  // Show loading until auth AND onboarding state are both loaded
  if (authLoading || onboardingLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-20 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-secondary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <PageTransition>
          <main className="pt-20">
            <section className="py-16">
              <div className="container mx-auto px-4 text-center">
                <h1 className="font-display text-3xl font-bold text-foreground mb-4">Learning Journeys</h1>
                <p className="text-muted-foreground mb-8">Please log in to access your learning journeys.</p>
              </div>
            </section>
          </main>
        </PageTransition>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main className="pt-20">
          {/* Header */}
          <section className="py-12 gradient-hero text-primary-foreground">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="w-8 h-8" />
                <h1 className="font-display text-3xl font-bold">Boosting Journeys</h1>
              </div>
              <p className="text-primary-foreground/80 max-w-2xl">
                Choose your learning path and master the skills needed to succeed in the startup ecosystem.
              </p>
            </div>
          </section>

          {/* Learning Paths Selection */}
          <section className="py-12">
            <div className="container mx-auto px-4">
              {/* Stats Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                <Card className="text-center p-4">
                  <div className="text-3xl font-bold text-primary">3</div>
                  <div className="text-sm text-muted-foreground">Learning Paths</div>
                </Card>
                <Card className="text-center p-4">
                  <div className="text-3xl font-bold text-secondary">36</div>
                  <div className="text-sm text-muted-foreground">Total Quizzes</div>
                </Card>
                <Card className="text-center p-4">
                  <div className="text-3xl font-bold text-accent">12</div>
                  <div className="text-sm text-muted-foreground">Modules</div>
                </Card>
                <Card className="text-center p-4">
                  <div className="text-3xl font-bold text-purple-500">∞</div>
                  <div className="text-sm text-muted-foreground">Growth Potential</div>
                </Card>
              </div>

              {/* Path Cards */}
              <div className="grid md:grid-cols-3 gap-6">
                {learningPaths.map((path) => (
                  <Card 
                    key={path.id}
                    className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer group ${
                      selectedPath === path.id ? 'ring-2 ring-secondary shadow-lg' : ''
                    }`}
                    onClick={() => setSelectedPath(path.id)}
                  >
                    {/* Gradient Background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${path.gradient} opacity-50 group-hover:opacity-70 transition-opacity`} />
                    
                    <CardHeader className="relative">
                      <div className="flex items-start justify-between">
                        <div className={`p-3 rounded-xl bg-card shadow-sm ${path.color}`}>
                          {path.icon}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {path.duration}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl mt-4">{path.title}</CardTitle>
                      <CardDescription className="text-sm font-medium text-foreground/70">
                        {path.subtitle}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="relative space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {path.description}
                      </p>

                      {/* Skills Tags */}
                      <div className="flex flex-wrap gap-2">
                        {path.skills.map((skill) => (
                          <Badge key={skill} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>

                      {/* Module & Quiz Info */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          <span>{path.modules} Modules</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{path.quizzes} Quizzes</span>
                        </div>
                      </div>

                      {/* Progress Bar (placeholder for future) */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">0%</span>
                        </div>
                        <Progress value={0} className="h-2" />
                      </div>

                      {/* Action Button */}
                      <Button 
                        className="w-full group/btn"
                        variant={selectedPath === path.id ? "default" : "outline"}
                      >
                        <Play className="w-4 h-4 mr-2 group-hover/btn:scale-110 transition-transform" />
                        Start Learning
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Quiz Preview Section */}
              {selectedPath && (
                <div className="mt-12">
                  <Card className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <Trophy className="w-6 h-6 text-secondary" />
                      <h3 className="font-display text-xl font-bold">
                        Preview: {learningPaths.find(p => p.id === selectedPath)?.title}
                      </h3>
                    </div>

                    {/* Sample Quiz Question */}
                    <div className="bg-muted/50 rounded-xl p-6 mb-6">
                      <p className="text-sm text-muted-foreground mb-2">Sample Question</p>
                      <h4 className="font-medium text-lg mb-4">
                        What is the most important first step when validating a startup idea?
                      </h4>
                      
                      <div className="space-y-3">
                        {[
                          "Build a complete MVP product",
                          "Talk to potential customers and gather feedback",
                          "Create a detailed business plan",
                          "Secure funding from investors"
                        ].map((option, index) => (
                          <button
                            key={index}
                            className="w-full text-left p-4 rounded-lg border border-border bg-card hover:border-secondary hover:bg-secondary/5 transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
                                {String.fromCharCode(65 + index)}
                              </span>
                              <span>{option}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Complete quizzes to earn certifications and unlock new opportunities.
                      </p>
                      <Button>
                        Begin Full Journey
                        <Play className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </section>
        </main>
      </PageTransition>
      <Footer />
    </div>
  );
};

export default Journey;
