import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import { setupPWA } from "@/lib/pwa";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import i18n from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { useSessionManager } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ThemeProvider } from "next-themes";

function Router() {
  const [farmer, setFarmer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  const { showWarning, stayLoggedIn, handleLogout } = useSessionManager(() => {
    setFarmer(null);
    setLocation("/");
  });

  useEffect(() => {
    const savedLanguage = localStorage.getItem('farmwise-language');
    if (savedLanguage && ['en', 'hi', 'od'].includes(savedLanguage)) {
      i18n.changeLanguage(savedLanguage);
    }

    // 1. Check local storage session first
    const savedFarmerStr = localStorage.getItem('farmwise-farmer');
    if (savedFarmerStr) {
      try {
        const savedFarmer = JSON.parse(savedFarmerStr);
        if (savedFarmer && savedFarmer.id) {
          setFarmer(savedFarmer);
        }
      } catch (e) {
        console.error("Error parsing saved farmer session", e);
      }
    }

    // 2. Check active Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        syncOrFetchProfile(session.user.id, session.user.email || undefined, session.user.user_metadata || {});
      } else {
        setIsLoading(false);
      }
    }).catch(() => {
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        syncOrFetchProfile(session.user.id, session.user.email || undefined, session.user.user_metadata || {});
      } else if (!localStorage.getItem('farmwise-farmer')) {
        setFarmer(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const syncOrFetchProfile = async (userId: string, email?: string, metadata: Record<string, any> = {}) => {
    try {
      const response = await fetch(`/api/farmers/${userId}`);
      if (response.ok) {
        const data = await response.json();
        const farmerObj = data.farmer || data;
        setFarmer(farmerObj);
        localStorage.setItem('farmwise-farmer', JSON.stringify(farmerObj));
      } else {
        const savedFarmerStr = localStorage.getItem('farmwise-farmer');
        let savedFarmer = null;
        if (savedFarmerStr) {
          try {
            savedFarmer = JSON.parse(savedFarmerStr);
          } catch (parseError) {
            console.warn('Could not parse saved farmer profile', parseError);
          }
        }
        const profileSource = savedFarmer || {
          name: metadata.name || metadata.full_name || 'Farmer',
          phone: metadata.phone || metadata.phone_number || '',
          email: email || metadata.email || '',
          state: metadata.state || '',
          district: metadata.district || '',
          language: metadata.language || 'en'
        };

        if (profileSource?.phone && profileSource?.state && profileSource?.district) {
          const syncResponse = await fetch('/api/farmers/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: userId,
              sourceFarmerId: savedFarmer?.id,
              name: profileSource.name,
              phone: profileSource.phone,
              email: profileSource.email,
              state: profileSource.state,
              district: profileSource.district,
              language: profileSource.language || 'en'
            })
          });

          if (syncResponse.ok) {
            const syncResult = await syncResponse.json();
            const farmerObj = syncResult.farmer;
            setFarmer(farmerObj);
            localStorage.setItem('farmwise-farmer', JSON.stringify(farmerObj));
          } else if (savedFarmer) {
            setFarmer(savedFarmer);
          }
        } else if (savedFarmer) {
          setFarmer(savedFarmer);
          localStorage.setItem('farmwise-farmer', JSON.stringify(savedFarmer));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading FarmAdvisory...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Switch>
        <Route path="/">
          {farmer ? (
            <Dashboard farmer={farmer} onLogout={handleLogout} />
          ) : (
            <Landing onLogin={setFarmer} />
          )}
        </Route>
        <Route component={NotFound} />
      </Switch>

      {/* Session Warning Modal */}
      <Dialog open={showWarning} onOpenChange={stayLoggedIn}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session Expiring Soon</DialogTitle>
            <DialogDescription>
              Your session will expire in 5 minutes due to inactivity. Do you want to stay logged in?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleLogout}>Logout</Button>
            <Button onClick={stayLoggedIn}>Stay Logged In</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function App() {
  useEffect(() => {
    setupPWA();
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
