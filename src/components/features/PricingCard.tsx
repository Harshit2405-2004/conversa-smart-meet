
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

interface PricingCardProps {
  name: string;
  price: string;
  features: string[];
  highlighted?: boolean;
  priceId?: string; // Stripe Price ID
}

export function PricingCard({ name, price, features, highlighted = false, priceId }: PricingCardProps) {
  const { user } = useAuth();
  const { isAuthenticated } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      navigate('/auth');
      return;
    }

    if (!priceId) {
      // This is for the free plan or a plan without a price ID
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: { priceId },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.sessionUrl) {
        // Redirect to Stripe Checkout
        window.location.href = data.sessionUrl;
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        title: "Subscription error",
        description: error.message || "Failed to initiate subscription process",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={`w-full ${highlighted ? 'border-meetassist-primary shadow-lg relative' : ''}`}>
      {highlighted && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <span className="bg-meetassist-primary text-white text-xs font-medium px-3 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}
      <CardHeader>
        <CardTitle className={highlighted ? "text-meetassist-primary" : ""}>{name}</CardTitle>
        <CardDescription>
          <span className="text-2xl font-bold">{price}</span>
          {price !== "$0" && <span className="text-sm text-muted-foreground">/month</span>}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check size={18} className="mr-2 text-green-500 shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button 
          className={`w-full ${highlighted ? 'bg-meetassist-primary hover:bg-meetassist-secondary' : ''}`}
          variant={highlighted ? "default" : "outline"}
          onClick={handleSubscribe}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center">
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent"></span>
              Processing...
            </span>
          ) : (
            highlighted ? "Upgrade Now" : "Get Started"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
