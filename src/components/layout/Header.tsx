
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { LogOut, Settings, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { isAuthenticated, user, logout } = useStore();

  return (
    <header className="sticky top-0 z-30 w-full bg-background border-b">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-meetassist-primary flex items-center justify-center">
            <span className="text-white font-semibold">M</span>
          </div>
          <span className="font-bold text-lg">Conversa</span>
          <span className="text-meetassist-primary font-bold">Meet</span>
        </div>
        
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <div className="hidden md:block">
                <span className="text-sm font-medium mr-1">{user?.name}</span>
                {user?.plan === "premium" && (
                  <span className="text-xs bg-meetassist-primary/10 text-meetassist-primary px-2 py-0.5 rounded-full">
                    Premium
                  </span>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative w-9 h-9 rounded-full p-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                      <User className="h-5 w-5" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <a href="#login">Sign In</a>
              </Button>
              <Button className="bg-meetassist-primary hover:bg-meetassist-secondary" asChild>
                <a href="#register">Get Started</a>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
