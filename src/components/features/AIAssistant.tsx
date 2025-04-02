
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Bot, User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";

export function AIAssistant() {
  const [inputValue, setInputValue] = useState("");
  const { user, chatMessages, sendChatMessage } = useStore();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    sendChatMessage(inputValue);
    setInputValue("");
  };
  
  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>AI Assistant</CardTitle>
            <CardDescription>
              Ask questions about your meeting or get help
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
        <ScrollArea className="h-[250px] pr-4">
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
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-left justify-start h-auto py-2"
                  onClick={() => sendChatMessage("Create a summary of this meeting")}
                >
                  Create a summary of this meeting
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-left justify-start h-auto py-2"
                  onClick={() => sendChatMessage("What are the action items from this meeting?")}
                >
                  What are the action items?
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-left justify-start h-auto py-2"
                  onClick={() => sendChatMessage("Help me draft a follow-up email")}
                >
                  Help me draft a follow-up email
                </Button>
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
                        <Bot size={18} />
                      )}
                    </div>
                    <div
                      className={`p-3 rounded-lg ${
                        message.sender === "user"
                          ? "bg-meetassist-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
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
            placeholder="Ask about your meeting..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-grow"
          />
          <Button type="submit" size="icon" disabled={!inputValue.trim()}>
            <Send size={18} />
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
