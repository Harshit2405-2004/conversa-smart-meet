
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/sections/HeroSection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { PricingSection } from "@/components/sections/PricingSection";
import { DemoSection } from "@/components/sections/DemoSection";
import { CTASection } from "@/components/sections/CTASection";
import { AuthTabs } from "@/components/auth/AuthTabs";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { useStore } from "@/lib/store";

const Index = () => {
  const { isAuthenticated } = useStore();
  const [authActive, setAuthActive] = useState(false);
  
  // Listen for hash changes to show auth dialog
  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash;
      setAuthActive(hash === "#login" || hash === "#register");
    };
    
    window.addEventListener('hashchange', checkHash);
    checkHash(); // Check on initial load
    
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      {isAuthenticated ? (
        <main className="flex-1">
          <DashboardContent />
        </main>
      ) : (
        <main className="flex-1">
          {authActive ? (
            <section className="py-16 lg:py-24 flex items-center justify-center">
              <AuthTabs />
            </section>
          ) : (
            <>
              <HeroSection />
              <FeaturesSection />
              <DemoSection />
              <PricingSection />
              <CTASection />
            </>
          )}
        </main>
      )}
      
      <Footer />
    </div>
  );
};

export default Index;
