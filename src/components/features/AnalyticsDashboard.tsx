
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Calendar, BarChart2, Clock, Activity, Users, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

// Define chart colors
const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A4DE6C'];
const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export function AnalyticsDashboard() {
  const { toast } = useToast();
  const { user } = useStore();
  const [timeframe, setTimeframe] = useState('month');
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch analytics data
  useEffect(() => {
    fetchAnalyticsData();
  }, [timeframe]);
  
  const fetchAnalyticsData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('analytics-insights', {
        body: { timeframe }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      setAnalyticsData(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data. Please try again later.');
      toast({
        title: "Analytics Error",
        description: err.message || "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Prepare data for charts
  const prepareMeetingData = () => {
    if (!analyticsData || !analyticsData.meetings || !analyticsData.meetings.byDay) {
      return [];
    }
    
    return analyticsData.meetings.byDay.map((item: any) => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      meetings: item.meetings
    }));
  };
  
  const prepareUsageData = () => {
    if (!analyticsData || !analyticsData.usage) {
      return [];
    }
    
    return [
      { 
        name: 'Transcription',
        used: analyticsData.usage.transcription.minutesUsed,
        remaining: analyticsData.usage.transcription.minutesRemaining
      },
      {
        name: 'AI Queries',
        used: analyticsData.usage.aiAssistant.queriesUsed,
        remaining: analyticsData.usage.aiAssistant.queriesRemaining
      }
    ];
  };
  
  const preparePieData = () => {
    if (!analyticsData || !analyticsData.meetings) {
      return [];
    }
    
    // Sample data - in a real application, you would calculate this from actual data
    return [
      { name: '0-15 min', value: 4 },
      { name: '15-30 min', value: 6 },
      { name: '30-60 min', value: 8 },
      { name: '>60 min', value: 2 }
    ];
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <Tabs value={timeframe} onValueChange={setTimeframe} className="w-auto">
          <TabsList>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="quarter">Quarter</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="w-full h-[200px] animate-pulse">
              <div className="h-full bg-accent/20"></div>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="w-full p-8 text-center">
          <CardContent>
            <div className="text-destructive mb-4">
              <span className="text-6xl">⚠️</span>
            </div>
            <p>{error}</p>
            <Button onClick={fetchAnalyticsData} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Usage Summary Cards */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Meetings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                  <div className="text-2xl font-bold">
                    {analyticsData?.meetings?.total || 0}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  In the past {timeframe}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Meeting Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                  <div className="text-2xl font-bold">
                    {analyticsData?.meetings?.totalMinutes || 0}
                    <span className="text-sm font-normal ml-1">min</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg: {analyticsData?.meetings?.averageLength || 0} min per meeting
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Subscription</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Activity className="w-4 h-4 mr-2 text-muted-foreground" />
                  <div className="text-2xl font-bold capitalize">
                    {analyticsData?.plan || 'Free'}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {user?.remainingTranscription || 0} transcription minutes left
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Charts */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Meeting Frequency</CardTitle>
                <CardDescription>Number of meetings over time</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prepareMeetingData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="meetings" fill="#8884d8" name="Meetings" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Usage Statistics</CardTitle>
                <CardDescription>Resource consumption</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={prepareUsageData()}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="used" stackId="a" fill="#0088FE" name="Used" />
                    <Bar dataKey="remaining" stackId="a" fill="#82ca9d" name="Remaining" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          {/* Recent Meetings */}
          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle>Recent Meetings</CardTitle>
              <CardDescription>Your latest transcribed meetings</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                {analyticsData?.meetings?.recent && analyticsData.meetings.recent.length > 0 ? (
                  <div className="space-y-4">
                    {analyticsData.meetings.recent.map((meeting: any, index: number) => (
                      <div key={index} className="flex items-center justify-between border-b pb-3">
                        <div>
                          <h4 className="font-medium">{meeting.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(meeting.date).toLocaleDateString()} - {meeting.duration} min
                          </p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <FileText size={16} className="mr-1" />
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No meetings found for this time period.</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
