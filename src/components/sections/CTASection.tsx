
import { Button } from "@/components/ui/button";
import { Chrome, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

export function CTASection() {
  const [isChrome, setIsChrome] = useState(false);

  useEffect(() => {
    // Check if browser is Chrome/Chromium-based
    const isChromeBrowser = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    setIsChrome(isChromeBrowser);
  }, []);

  const handleInstallExtension = () => {
    // Chrome Web Store URL - update this with your actual Web Store URL when published
    const extensionUrl = "https://chrome.google.com/webstore/detail/meetassist-ai-meeting-ass/YOUR_EXTENSION_ID_HERE";
    window.open(extensionUrl, '_blank');
  };

  return (
    <section className="py-12 md:py-24">
      <div className="container px-4 md:px-6">
        <div className="rounded-3xl bg-meetassist-primary/10 px-6 py-12 md:p-12 flex flex-col items-center text-center">
          <div className="space-y-4 max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl/tight gradient-heading">
              Ready to transform your Google Meet experience?
            </h2>
            <p className="text-lg text-muted-foreground md:text-xl">
              Join thousands of professionals who are using MeetAssist to make their meetings more productive.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button 
              size="lg" 
              className="bg-meetassist-primary hover:bg-meetassist-secondary flex items-center"
              onClick={handleInstallExtension}
            >
              <Chrome className="mr-2 h-5 w-5" /> Install Chrome Extension
            </Button>
            <Button variant="outline" size="lg">
              Learn More <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
