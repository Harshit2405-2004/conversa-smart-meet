
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Bot, User, AlertCircle, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

export function AIAssistant() {
  const [inputValue, setInputValue] = useState("");
  const { user, chatMessages, sendChatMessage, currentTranscriptId } = useStore();
  const [isTyping, setIsTyping] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    if (!currentTranscriptId) {
      toast({
        title: "No transcript selected",
        description: "Please select a transcript before sending a message.",
        variant: "destructive"
      });
      return;
    }
    
    sendChatMessage(inputValue);
    setInputValue("");
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollArea = scrollAreaRef.current;
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  }, [chatMessages]);
  
  const getSuggestedQueries = () => {
    if (!currentTranscriptId) {
      return [
        "Select a transcript to chat about it",
        "I can help analyze your meetings",
        "Try selecting a transcript from the History tab"
      ];
    }
    
    return [
      "Create a summary of this meeting",
      "What are the action items from this meeting?",
      "Identify the key decisions made",
      "Who were the main participants?",
      "Help me draft a follow-up email"
    ];
  };

  const handleSuggestedQuery = (query: string) => {
    if (!currentTranscriptId) {
      toast({
        title: "No transcript selected",
        description: "Please select a transcript first.",
        variant: "destructive"
      });
      return;
    }
    
    sendChatMessage(query);
  };
  
  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>AI Assistant</CardTitle>
            <CardDescription>
              Powered by Google Vertex AI
            </CardDescription>
          </div>
          {user && (
            <Badge variant="outline">
              {user.remainingAIQueries} queries left
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-auto">
        <ScrollArea className="h-[250px] pr-4 messages-scroll-area" ref={scrollAreaRef}>
          {chatMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
              <Bot size={32} className="text-meetassist-primary" />
              <div>
                <p className="font-medium">Meeting Assistant AI</p>
                <p className="text-sm text-muted-foreground">
                  Ask me questions about your meeting, request summaries,<br />
                  or get help with follow-up tasks.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 w-full max-w-xs mt-2">
                {getSuggestedQueries().map((query, index) => (
                  <Button 
                    key={index}
                    variant="outline" 
                    size="sm" 
                    className="text-left justify-start h-auto py-2"
                    onClick={() => handleSuggestedQuery(query)}
                    disabled={!currentTranscriptId}
                  >
                    {query}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`flex items-start gap-2 max-w-[80%] ${
                      message.sender === "user" ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div
                      className={`p-1 rounded-full ${
                        message.sender === "user"
                          ? "bg-meetassist-primary text-white"
                          : "bg-muted"
                      }`}
                    >
                      {message.sender === "user" ? (
                        <User size={18} />
                      ) : (
                        message.id === 'loading' ? (
                          <div className="animate-spin"><Bot size={18} /></div>
                        ) : message.text.includes("Sorry, I had trouble") ? (
                          <AlertCircle size={18} />
                        ) : (
                          <Bot size={18} />
                        )
                      )}
                    </div>
                    <div
                      className={`p-3 rounded-lg ${
                        message.sender === "user"
                          ? "bg-meetassist-primary text-primary-foreground"
                          : message.id === 'loading'
                          ? "bg-muted animate-pulse"
                          : message.text.includes("Sorry, I had trouble")
                          ? "bg-muted/80 text-destructive"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-line">
                        {message.id === 'loading' ? 'Analyzing meeting content...' : message.text}
                      </p>
                      
                      {/* Display sentiment information if available */}
                      {message.sender === 'ai' && message.text.includes('Overall meeting sentiment') && (
                        <div className="mt-2 pt-2 border-t border-muted-foreground/20">
                          <p className="text-xs text-muted-foreground">
                            Sentiment analysis provided by Google Natural Language API
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2">
          <Input
            placeholder={currentTranscriptId ? "Ask about your meeting..." : "Select a transcript first"}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-grow"
            disabled={!currentTranscriptId || chatMessages.some(msg => msg.id === 'loading')}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!inputValue.trim() || !currentTranscriptId || chatMessages.some(msg => msg.id === 'loading')}
          >
            {chatMessages.some(msg => msg.id === 'loading') ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
