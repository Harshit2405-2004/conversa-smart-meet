
import { Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t py-6 md:py-8">
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-meetassist-primary flex items-center justify-center">
            <span className="text-white font-semibold text-xs">M</span>
          </div>
          <span className="text-sm font-semibold">Conversa</span>
          <span className="text-sm text-meetassist-primary font-semibold">Meet</span>
        </div>
        
        <p className="text-center text-sm text-muted-foreground md:text-left">
          &copy; {new Date().getFullYear()} Conversa Meet. All rights reserved.
        </p>
        
        <div className="flex items-center space-x-4">
          <a
            href="#"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Terms
          </a>
          <a
            href="#"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy
          </a>
          <a
            href="#"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Github size={18} />
            <span className="sr-only">GitHub</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
