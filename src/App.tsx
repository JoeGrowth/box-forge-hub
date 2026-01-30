import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { OnboardingProvider } from "@/hooks/useOnboarding";
import { LearningJourneysProvider } from "@/hooks/useLearningJourneys";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import Index from "./pages/Index";
import Home from "./pages/Home";
import About from "./pages/About";
import Boxes from "./pages/Boxes";
import BoxDetail from "./pages/BoxDetail";
import Programs from "./pages/Programs";
import Join from "./pages/Join";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import AdminOpportunityDetail from "./pages/AdminOpportunityDetail";
import Opportunities from "./pages/Opportunities";
import OpportunityDetail from "./pages/OpportunityDetail";
import CoBuilders from "./pages/CoBuilders";
import Journey from "./pages/Journey";
import Mask from "./pages/Mask";
import Scale from "./pages/Scale";
import Checklist from "./pages/Checklist";
import Resume from "./pages/Resume";
import CreateIdea from "./pages/CreateIdea";
import EditIdea from "./pages/EditIdea";
import Stories from "./pages/Stories";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Chat from "./pages/Chat";
import DirectChat from "./pages/DirectChat";
import Messages from "./pages/Messages";
import NRDecoder from "./pages/NRDecoder";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <OnboardingProvider>
        <LearningJourneysProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/home" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/boxes" element={<Boxes />} />
                <Route path="/boxes/:boxId" element={<BoxDetail />} />
                <Route path="/programs" element={<Programs />} />
                <Route path="/join" element={<Join />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/login" element={<Auth />} />
                <Route path="/signup" element={<Auth />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/opportunity/:id" element={<AdminOpportunityDetail />} />
                <Route path="/opportunities" element={<Opportunities />} />
                <Route path="/opportunities/:id" element={<OpportunityDetail />} />
                <Route path="/cobuilders" element={<CoBuilders />} />
                <Route path="/journey" element={<Journey />} />
                <Route path="/mask" element={<Mask />} />
                <Route path="/start" element={<Scale />} />
                <Route path="/checklist" element={<Checklist />} />
                <Route path="/resume" element={<Resume />} />
                <Route path="/create-idea" element={<CreateIdea />} />
                <Route path="/edit-idea/:id" element={<EditIdea />} />
                <Route path="/chat/:applicationId" element={<Chat />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/messages/:conversationId" element={<Messages />} />
                <Route path="/stories" element={<Stories />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/decoder" element={<NRDecoder />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </LearningJourneysProvider>
      </OnboardingProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
