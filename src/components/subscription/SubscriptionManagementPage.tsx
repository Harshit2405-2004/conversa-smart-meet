
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/lib/store";

interface SubscriptionDetails {
  id: string;
  status: string;
  current_period_end: number;
  cancel_at_period_end: boolean;
}

export function SubscriptionManagementPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAuthenticated } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [isCancellingSubscription, setIsCancellingSubscription] = useState(false);
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchSubscriptionDetails();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated]);
  
  const fetchSubscriptionDetails = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {});
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data) {
        setSubscription(data.subscription);
        setCurrentPlan(data.plan);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      toast({
        title: "Error loading subscription",
        description: "We couldn't load your subscription details. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCancelSubscription = async () => {
    if (!subscription?.id) return;
    
    setIsCancellingSubscription(true);
    try {
      const { error } = await supabase.functions.invoke('cancel-subscription', {
        body: { subscriptionId: subscription.id },
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      toast({
        title: "Subscription canceled",
        description: "Your subscription will end at the end of the billing period.",
      });
      
      // Refresh subscription details
      fetchSubscriptionDetails();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: "Error cancelling subscription",
        description: error.message || "We couldn't cancel your subscription. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsCancellingSubscription(false);
    }
  };
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
        <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
        <h3 className="text-xl font-bold mb-2">Authentication Required</h3>
        <p className="text-muted-foreground mb-4">
          Please sign in to manage your subscription
        </p>
        <Button asChild>
          <a href="#login">Sign In</a>
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container py-12">
      <h1 className="text-3xl font-bold mb-8">Subscription Management</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            {currentPlan === 'premium' 
              ? "You're currently on the Premium plan" 
              : "You're currently on the Free plan"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentPlan === 'premium' ? (
            <div className="space-y-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span>
                  Premium access activated
                </span>
              </div>
              
              {subscription && (
                <>
                  <div className="px-4 py-3 rounded-md bg-muted">
                    <p className="font-medium">Subscription Details</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Status: <span className="font-medium text-foreground capitalize">{subscription.status}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Current period ends: <span className="font-medium text-foreground">{formatDate(subscription.current_period_end)}</span>
                    </p>
                    {subscription.cancel_at_period_end && (
                      <p className="text-sm text-amber-500 font-medium mt-2">
                        Your subscription is set to cancel at the end of the billing period
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p>
                Upgrade to Premium to unlock:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>300 minutes of transcription per month</li>
                <li>Unlimited AI assistant queries</li>
                <li>Advanced analytics & summaries</li>
                <li>Priority support</li>
              </ul>
              <Button className="mt-4">Upgrade to Premium</Button>
            </div>
          )}
        </CardContent>
        
        {subscription && currentPlan === 'premium' && !subscription.cancel_at_period_end && (
          <CardFooter>
            <Button 
              variant="outline" 
              onClick={handleCancelSubscription}
              disabled={isCancellingSubscription}
            >
              {isCancellingSubscription && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Cancel Subscription
            </Button>
          </CardFooter>
        )}
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
          <CardDescription>
            Your current usage statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">Transcription Minutes</p>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full" 
                  style={{ width: `${user?.remainingTranscription ? (user.remainingTranscription / (currentPlan === 'premium' ? 300 : 30) * 100) : 0}%` }}
                ></div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {user?.remainingTranscription || 0} minutes remaining
              </p>
            </div>
            
            <div>
              <p className="text-sm font-medium mb-1">AI Queries</p>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full" 
                  style={{ width: `${user?.remainingAIQueries ? (user.remainingAIQueries / (currentPlan === 'premium' ? 150 : 30) * 100) : 0}%` }}
                ></div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {user?.remainingAIQueries || 0} queries remaining
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
