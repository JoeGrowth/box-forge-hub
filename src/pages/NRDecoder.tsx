import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Send, Brain, CheckCircle2, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const QUESTIONS = [
  {
    id: 1,
    question: "When people come to you for help, what is the type of help they expect?",
    hint: "e.g. ideas, structure, clarity, solutions, emotional support, growth, design, decision-making...",
  },
  {
    id: 2,
    question: "What is something you do easily that others find difficult?",
    hint: "",
  },
  {
    id: 3,
    question: 'What are you doing when you feel "in flow"?',
    hint: "You lose track of time.",
  },
  {
    id: 4,
    question: "What result do you produce without even trying?",
    hint: "",
  },
  {
    id: 5,
    question: 'Finish the sentence: "What I naturally do is: to __"',
    hint: "",
  },
  {
    id: 6,
    question: "What is the most repeated positive feedback you hear about your work?",
    hint: "",
  },
  {
    id: 7,
    question: "If you could only solve ONE type of problem for the world, which problem would you choose?",
    hint: "",
  },
];

interface Message {
  id: string;
  type: "bot" | "user";
  content: string;
  timestamp: Date;
}

const NRDecoder = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasExistingSubmission, setHasExistingSubmission] = useState(false);
  const [checkingSubmission, setCheckingSubmission] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasCheckedSubmission = useRef(false);
  const hasInitialized = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check for existing submission - only run once per user
  useEffect(() => {
    // Skip if already checked or still loading auth
    if (hasCheckedSubmission.current || authLoading) return;

    const checkExistingSubmission = async () => {
      if (!user) {
        setCheckingSubmission(false);
        return;
      }

      hasCheckedSubmission.current = true;

      try {
        const { data } = await supabase.from("nr_decoder_submissions").select("*").eq("user_id", user.id).single();

        if (data) {
          setHasExistingSubmission(true);
          if (data.status === "completed") {
            setIsComplete(true);
          }
        }
      } catch (error) {
        // No existing submission found - this is fine
      } finally {
        setCheckingSubmission(false);
      }
    };

    checkExistingSubmission();
  }, [user?.id, authLoading]);

  // Initialize first message - only run once after we've checked for existing submission
  useEffect(() => {
    if (authLoading || checkingSubmission || hasInitialized.current) return;
    if (!user || hasExistingSubmission) return;

    hasInitialized.current = true;

    const welcomeMessage: Message = {
      id: "welcome",
      type: "bot",
      content:
        "Welcome to the Natural Role Decoder! 🧠\n\nI'll ask you 7 questions to help discover your natural role. Take your time - there are no right or wrong answers.",
      timestamp: new Date(),
    };

    const timeoutId1 = setTimeout(() => {
      setMessages([welcomeMessage]);

      // Add first question after a delay
      setTimeout(() => {
        const question = QUESTIONS[0];
        const questionMessage: Message = {
          id: `q-${question.id}`,
          type: "bot",
          content: `**Question ${question.id}/7**\n\n${question.question}${question.hint ? `\n\n_${question.hint}_` : ""}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, questionMessage]);
      }, 1000);
    }, 500);

    return () => clearTimeout(timeoutId1);
  }, [authLoading, checkingSubmission, user, hasExistingSubmission]);

  const addBotQuestion = (index: number) => {
    const question = QUESTIONS[index];
    const questionMessage: Message = {
      id: `q-${question.id}`,
      type: "bot",
      content: `**Question ${question.id}/7**\n\n${question.question}${question.hint ? `\n\n_${question.hint}_` : ""}`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, questionMessage]);
  };

  const handleSendAnswer = async () => {
    if (!userInput.trim() || isSubmitting) return;

    const currentQuestion = QUESTIONS[currentQuestionIndex];

    // Add user message
    const userMessage: Message = {
      id: `a-${currentQuestion.id}`,
      type: "user",
      content: userInput.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Save answer
    const newAnswers = { ...answers, [currentQuestion.id]: userInput.trim() };
    setAnswers(newAnswers);
    setUserInput("");

    // Check if this was the last question
    if (currentQuestionIndex === QUESTIONS.length - 1) {
      setIsSubmitting(true);

      // Add completion message
      setTimeout(() => {
        const completionMessage: Message = {
          id: "completion",
          type: "bot",
          content:
            "Thank you for completing the Natural Role Decoder! ✨\n\nYour answers have been submitted. An admin will review them and send you a personalized PDF with your Natural Role blueprint.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, completionMessage]);
      }, 500);

      // Submit to database
      try {
        const { error } = await supabase.from("nr_decoder_submissions").insert({
          user_id: user!.id,
          answers: newAnswers,
          status: "pending",
        });

        if (error) throw error;

        setIsComplete(true);
        toast({
          title: "Submission Complete!",
          description: "An admin will review your answers and send you your Natural Role blueprint.",
        });
      } catch (error: any) {
        console.error("Failed to submit:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to submit. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Move to next question
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);

      setTimeout(() => {
        addBotQuestion(nextIndex);
      }, 800);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendAnswer();
    }
  };

  if (authLoading || checkingSubmission) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20 pb-16">
          <div className="container mx-auto px-4 py-16 text-center">
            <Brain className="w-16 h-16 text-b4-teal mx-auto mb-6" />
            <h1 className="font-display text-3xl font-bold text-foreground mb-4">Natural Role Decoder</h1>
            <p className="text-muted-foreground mb-8">Please sign in to take the Natural Role Decoder test.</p>
            <Button variant="teal" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (hasExistingSubmission) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20 pb-16">
          <div className="container mx-auto px-4 py-16 text-center">
            <CheckCircle2 className="w-16 h-16 text-b4-teal mx-auto mb-6" />
            <h1 className="font-display text-3xl font-bold text-foreground mb-4">Already Submitted!</h1>
            <p className="text-muted-foreground mb-8">
              You've already completed the Natural Role Decoder. An admin will review your submission and send you your
              personalized blueprint.
            </p>
            <Button variant="outline" onClick={() => navigate("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-20 pb-4 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-b4-teal to-emerald-500 text-primary-foreground py-4 px-4">
          <div className="container mx-auto flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display font-bold">Natural Role Decoder</h1>
              <p className="text-sm text-primary-foreground/80">
                Question {Math.min(currentQuestionIndex + 1, 7)} of 7
              </p>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto bg-muted/30">
          <div className="container mx-auto px-4 py-6 max-w-2xl">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`flex gap-2 max-w-[85%] ${message.type === "user" ? "flex-row-reverse" : ""}`}>
                    {message.type === "bot" && (
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback className="bg-b4-teal text-primary-foreground text-xs">
                          <Brain className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-3 ${
                        message.type === "user"
                          ? "bg-b4-teal text-primary-foreground rounded-br-md"
                          : "bg-card border border-border rounded-bl-md"
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap">
                        {message.content.split("\n").map((line, i) => {
                          if (line.startsWith("**") && line.endsWith("**")) {
                            return (
                              <p key={i} className="font-semibold">
                                {line.slice(2, -2)}
                              </p>
                            );
                          }
                          if (line.startsWith("_") && line.endsWith("_")) {
                            return (
                              <p key={i} className="text-muted-foreground italic text-xs mt-1">
                                {line.slice(1, -1)}
                              </p>
                            );
                          }
                          return <p key={i}>{line}</p>;
                        })}
                      </div>
                      <p
                        className={`text-xs mt-1 ${message.type === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                      >
                        {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Input Area */}
        {!isComplete && (
          <div className="border-t border-border bg-card p-4">
            <div className="container mx-auto max-w-2xl">
              <div className="flex gap-2">
                <Textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type your answer..."
                  className="min-h-[44px] max-h-32 resize-none"
                  disabled={isSubmitting}
                />
                <Button
                  variant="teal"
                  size="icon"
                  onClick={handleSendAnswer}
                  disabled={!userInput.trim() || isSubmitting}
                  className="flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </div>
        )}

        {isComplete && (
          <div className="border-t border-border bg-card p-4">
            <div className="container mx-auto max-w-2xl text-center">
              <Button variant="outline" onClick={() => navigate("/")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default NRDecoder;
