
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Clock, Zap, RefreshCw, CreditCard, Calendar, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";

export function SubscriptionManagementPage() {
  const { user, checkSubscription } = useStore();
  const [loading, setLoading] = useState(false);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSubscriptionDetails();
  }, []);

  const fetchSubscriptionDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;
      
      setSubscriptionDetails(data);
      // Update the global state with subscription info
      await checkSubscription();
      
    } catch (error: any) {
      toast({
        title: "Error fetching subscription",
        description: error.message || "Failed to load subscription details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (priceId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: { priceId }
      });
      
      if (error) throw error;
      
      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      } else {
        throw new Error("No checkout URL returned");
      }
      
    } catch (error: any) {
      toast({
        title: "Error creating subscription",
        description: error.message || "Failed to start subscription process.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancellingSubscription(true);
    try {
      // In a real implementation, you would call an API to cancel the subscription
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription will remain active until the end of the billing period.",
      });
      
      // Refresh the subscription details
      await fetchSubscriptionDetails();
      
    } catch (error: any) {
      toast({
        title: "Error cancelling subscription",
        description: error.message || "Failed to cancel subscription.",
        variant: "destructive",
      });
    } finally {
      setCancellingSubscription(false);
    }
  };
  
  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const isPremium = user?.plan === 'premium';
  const remainingTranscription = user?.remainingTranscription || 0;
  const maxTranscription = isPremium ? 300 : 30;
  const transcriptionPercentage = Math.round((remainingTranscription / maxTranscription) * 100);
  
  const remainingAIQueries = user?.remainingAIQueries || 0;
  const maxAIQueries = isPremium ? 150 : 30;
  const AIQueriesPercentage = Math.round((remainingAIQueries / maxAIQueries) * 100);

  return (
    <div className="container my-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Subscription Management</h1>
          <p className="text-muted-foreground">
            Manage your subscription and view your usage
          </p>
        </div>
        
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="plans">Plans & Pricing</TabsTrigger>
            <TabsTrigger value="billing">Billing History</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Current Plan
                    {isPremium && (
                      <Badge className="ml-2 bg-emerald-600">Premium</Badge>
                    )}
                    {!isPremium && (
                      <Badge variant="outline">Free</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {isPremium ? 'Premium plan with advanced features' : 'Basic free plan'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {subscriptionDetails?.subscription && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Subscription Status</p>
                          <p className="font-medium">{subscriptionDetails.subscription.status}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Next Billing Date</p>
                          <p className="font-medium">{formatDate(subscriptionDetails.subscription.current_period_end)}</p>
                        </div>
                      </div>
                      
                      {subscriptionDetails.subscription.cancel_at_period_end && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mt-4">
                          <p className="text-sm text-amber-800">
                            Your subscription will be cancelled on {formatDate(subscriptionDetails.subscription.current_period_end)}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  
                  <div className="pt-4">
                    {!isPremium ? (
                      <Button 
                        onClick={() => handleUpgrade('price_premium_monthly')}
                        disabled={loading}
                        className="w-full"
                      >
                        <Trophy className="mr-2 h-4 w-4" /> Upgrade to Premium
                      </Button>
                    ) : subscriptionDetails?.subscription && !subscriptionDetails.subscription.cancel_at_period_end ? (
                      <Button 
                        variant="outline" 
                        onClick={handleCancelSubscription}
                        disabled={cancellingSubscription}
                        className="w-full"
                      >
                        {cancellingSubscription ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Processing...
                          </>
                        ) : (
                          <>Cancel Subscription</>
                        )}
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => handleUpgrade('price_premium_monthly')}
                        disabled={loading}
                        className="w-full"
                      >
                        <RefreshCw className="mr-2 h-4 w-4" /> Renew Subscription
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Usage</CardTitle>
                  <CardDescription>
                    Your current usage and limits
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>Transcription Minutes</span>
                      </div>
                      <span className="font-medium">{remainingTranscription} / {maxTranscription}</span>
                    </div>
                    <Progress value={transcriptionPercentage} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <div className="flex items-center">
                        <Zap className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>AI Queries</span>
                      </div>
                      <span className="font-medium">{remainingAIQueries} / {maxAIQueries}</span>
                    </div>
                    <Progress value={AIQueriesPercentage} className="h-2" />
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={fetchSubscriptionDetails}
                    disabled={loading}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Usage
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Plan Features</CardTitle>
                <CardDescription>
                  Compare your current plan features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1 font-medium">Feature</div>
                  <div className="col-span-1 font-medium">Free Plan</div>
                  <div className="col-span-1 font-medium">Premium Plan</div>
                  
                  <div className="col-span-1">Transcription Minutes</div>
                  <div className="col-span-1">30 minutes/month</div>
                  <div className="col-span-1">300 minutes/month</div>
                  
                  <div className="col-span-1">AI Assistant Queries</div>
                  <div className="col-span-1">30 queries/month</div>
                  <div className="col-span-1">150 queries/month</div>
                  
                  <div className="col-span-1">Meeting Summaries</div>
                  <div className="col-span-1">Basic</div>
                  <div className="col-span-1">Advanced with action items</div>
                  
                  <div className="col-span-1">Transcript History</div>
                  <div className="col-span-1">7 days</div>
                  <div className="col-span-1">Unlimited</div>
                  
                  <div className="col-span-1">Speaker Identification</div>
                  <div className="col-span-1">Basic</div>
                  <div className="col-span-1">Enhanced accuracy</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Plans Tab */}
          <TabsContent value="plans" className="space-y-4 pt-4">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Free Plan</CardTitle>
                  <CardDescription>
                    Basic features for occasional use
                  </CardDescription>
                  <div className="mt-2">
                    <p className="text-2xl font-bold">$0</p>
                    <p className="text-sm text-muted-foreground">Forever free</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <svg className="h-4 w-4 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      30 minutes of transcription/month
                    </li>
                    <li className="flex items-center">
                      <svg className="h-4 w-4 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      30 AI queries/month
                    </li>
                    <li className="flex items-center">
                      <svg className="h-4 w-4 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Basic meeting summaries
                    </li>
                    <li className="flex items-center">
                      <svg className="h-4 w-4 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      7-day transcript history
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" disabled={!isPremium}>
                    {!isPremium ? 'Current Plan' : 'Downgrade'}
                  </Button>
                </CardFooter>
              </Card>
              
              <Card className="border-primary">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Premium Plan</CardTitle>
                    <Badge>Recommended</Badge>
                  </div>
                  <CardDescription>
                    Advanced features for regular users
                  </CardDescription>
                  <div className="mt-2">
                    <p className="text-2xl font-bold">$9.99</p>
                    <p className="text-sm text-muted-foreground">per month</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <svg className="h-4 w-4 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      300 minutes of transcription/month
                    </li>
                    <li className="flex items-center">
                      <svg className="h-4 w-4 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      150 AI queries/month
                    </li>
                    <li className="flex items-center">
                      <svg className="h-4 w-4 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Advanced meeting summaries with action items
                    </li>
                    <li className="flex items-center">
                      <svg className="h-4 w-4 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Unlimited transcript history
                    </li>
                    <li className="flex items-center">
                      <svg className="h-4 w-4 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Enhanced speaker identification
                    </li>
                    <li className="flex items-center">
                      <svg className="h-4 w-4 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Priority support
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    disabled={loading || isPremium}
                    onClick={() => handleUpgrade('price_premium_monthly')}
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Processing...
                      </>
                    ) : isPremium ? (
                      'Current Plan'
                    ) : (
                      'Upgrade to Premium'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Annual Discount</CardTitle>
                <CardDescription>
                  Save 20% with annual billing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Premium Annual Plan</p>
                    <p className="text-sm text-muted-foreground">All Premium features with 20% discount</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">$95.88</p>
                    <p className="text-xs text-muted-foreground">$7.99/month, billed annually</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full"
                  disabled={loading}
                  onClick={() => handleUpgrade('price_premium_annual')}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Processing...
                    </>
                  ) : (
                    'Switch to Annual Billing'
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Billing History Tab */}
          <TabsContent value="billing" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Billing History</CardTitle>
                <CardDescription>
                  View your past invoices and payment history
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isPremium ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b">
                      <div>
                        <p className="font-medium">Premium Subscription</p>
                        <p className="text-sm text-muted-foreground">{formatDate(Date.now() / 1000 - 30 * 24 * 60 * 60)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">$9.99</p>
                        <Badge variant="outline" className="text-green-600">Paid</Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between py-3 border-b">
                      <div>
                        <p className="font-medium">Premium Subscription</p>
                        <p className="text-sm text-muted-foreground">{formatDate(Date.now() / 1000 - 60 * 24 * 60 * 60)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">$9.99</p>
                        <Badge variant="outline" className="text-green-600">Paid</Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4">
                      <Button variant="outline" onClick={() => window.open('https://yourappurl.com/download-invoices', '_blank')}>
                        <CreditCard className="mr-2 h-4 w-4" /> Download All Invoices
                      </Button>
                      
                      <Button variant="outline" onClick={() => window.open('https://yourappurl.com/manage-payment-methods', '_blank')}>
                        <CreditCard className="mr-2 h-4 w-4" /> Manage Payment Methods
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6">
                    <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium mb-1">No billing history</p>
                    <p className="text-sm text-muted-foreground mb-4">You're currently on the free plan.</p>
                    <Button onClick={() => handleUpgrade('price_premium_monthly')} disabled={loading}>
                      Upgrade to Premium
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
