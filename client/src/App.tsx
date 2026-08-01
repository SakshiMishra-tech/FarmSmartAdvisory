import { Switch, Route } from "wouter";
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

function Router() {
  const [farmer, setFarmer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedLanguage = localStorage.getItem('farmwise-language');
    if (savedLanguage && ['en', 'hi', 'od'].includes(savedLanguage)) {
      i18n.changeLanguage(savedLanguage);
    } else if (savedLanguage) {
      localStorage.removeItem('farmwise-language');
    }

    // Check for stored farmer data
    const storedFarmer = localStorage.getItem('farmwise-farmer');
    if (storedFarmer) {
      try {
        const parsedFarmer = JSON.parse(storedFarmer);
        if (!['en', 'hi', 'od'].includes(parsedFarmer.language)) {
          parsedFarmer.language = localStorage.getItem('farmwise-language') || 'en';
          localStorage.setItem('farmwise-farmer', JSON.stringify(parsedFarmer));
        }
        setFarmer(parsedFarmer);
      } catch (error) {
        console.error('Error parsing stored farmer data:', error);
        localStorage.removeItem('farmwise-farmer');
      }
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading FarmWise...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/">
        {farmer ? (
          <Dashboard farmer={farmer} onLogout={() => setFarmer(null)} />
        ) : (
          <Landing onLogin={setFarmer} />
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    setupPWA();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
