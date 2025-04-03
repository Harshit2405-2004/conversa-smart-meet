
import { useState } from "react";
import { AuthTabs } from "@/components/auth/AuthTabs";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Auth = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-t-meetassist-primary rounded-full animate-spin"></div>
      </div>
    );
  }
  
  // Redirect if user is already authenticated
  if (user) {
    return <Navigate to="/" />;
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <section className="py-16 lg:py-24 flex items-center justify-center">
          <AuthTabs />
        </section>
      </main>
    </div>
  );
};

export default Auth;
