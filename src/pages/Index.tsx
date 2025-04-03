import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/sections/HeroSection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { PricingSection } from "@/components/sections/PricingSection";
import { DemoSection } from "@/components/sections/DemoSection";
import { CTASection } from "@/components/sections/CTASection";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { setUser, fetchTranscripts } = useStore();
  const [showLandingPage, setShowLandingPage] = useState(true);
  
  useEffect(() => {
    if (loading) return;
    
    if (user) {
      // Fetch user profile data
      const fetchUserProfile = async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profile) {
          setUser({
            id: profile.id,
            email: profile.email,
            name: profile.name || profile.email.split('@')[0],
            plan: profile.plan === 'premium' ? 'premium' : 'free',
            remainingTranscription: profile.remaining_transcription,
            remainingAIQueries: profile.remaining_ai_queries
          });
          
          // Fetch user's transcripts
          fetchTranscripts();
        }
      };
      
      fetchUserProfile();
      setShowLandingPage(false);
    } else {
      setShowLandingPage(true);
    }
  }, [user, loading, setUser, fetchTranscripts]);
  
  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash;
      if (hash === "#login" || hash === "#register") {
        navigate('/auth');
        window.history.replaceState(null, '', window.location.pathname);
      }
    };
    
    window.addEventListener('hashchange', checkHash);
    checkHash(); // Check on initial load
    
    return () => window.removeEventListener('hashchange', checkHash);
  }, [navigate]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-t-meetassist-primary rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      {!showLandingPage ? (
        <main className="flex-1">
          <DashboardContent />
        </main>
      ) : (
        <main className="flex-1">
          <HeroSection />
          <FeaturesSection />
          <DemoSection />
          <PricingSection />
          <CTASection />
        </main>
      )}
      
      <Footer />
    </div>
  );
};

export default Index;
