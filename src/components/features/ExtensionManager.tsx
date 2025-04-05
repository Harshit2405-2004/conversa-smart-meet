
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, AlertCircle, Download, Chrome } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const EXTENSION_ID = "meetassist-extension"; // Replace with your actual extension ID when published

export function ExtensionManager() {
  const { toast } = useToast();
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [isCheckingInstallation, setIsCheckingInstallation] = useState(true);

  useEffect(() => {
    checkExtensionInstalled();
  }, []);

  const checkExtensionInstalled = async () => {
    setIsCheckingInstallation(true);
    try {
      // Try to send a message to the extension
      // Only works if extension is installed
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        try {
          await chrome.runtime.sendMessage(EXTENSION_ID, { action: 'ping' });
          setIsInstalled(true);
        } catch (e) {
          setIsInstalled(false);
        }
      } else {
        // If we can't access chrome.runtime, we're not in a browser that supports extensions
        setIsInstalled(false);
      }
    } catch (error) {
      console.error('Error checking extension installation:', error);
      setIsInstalled(false);
    } finally {
      setIsCheckingInstallation(false);
    }
  };

  const handleInstall = () => {
    // For Chrome Web Store
    const chromeWebStoreUrl = `https://chrome.google.com/webstore/detail/${EXTENSION_ID}`;
    window.open(chromeWebStoreUrl, '_blank');
    
    toast({
      title: "Extension Installation",
      description: "After installing the extension, please refresh this page.",
    });
  };

  if (isCheckingInstallation) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>MeetAssist Extension</CardTitle>
          <CardDescription>Checking extension status...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>MeetAssist Extension</CardTitle>
        <CardDescription>
          {isInstalled 
            ? "The MeetAssist extension is installed and ready to use" 
            : "Install the extension to enable Google Meet integration"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 p-4 rounded-lg bg-accent/20">
          {isInstalled ? (
            <>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium">Extension Installed</h3>
                <p className="text-sm text-muted-foreground">
                  You're all set! The MeetAssist extension is installed and ready to use.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-medium">Extension Required</h3>
                <p className="text-sm text-muted-foreground">
                  To transcribe Google Meet calls, you need to install the MeetAssist browser extension.
                </p>
              </div>
            </>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        {!isInstalled && (
          <Button onClick={handleInstall} className="w-full">
            <Chrome className="mr-2 h-4 w-4" />
            Install Extension
          </Button>
        )}
        {isInstalled && (
          <p className="text-sm text-muted-foreground w-full text-center">
            Join a Google Meet call to start using MeetAssist
          </p>
        )}
      </CardFooter>
    </Card>
  );
}
