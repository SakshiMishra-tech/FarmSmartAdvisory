import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours
const WARNING_BEFORE_MS = 5 * 60 * 1000; // 5 minutes

export function useSessionManager(onLogout: () => void) {
  const [showWarning, setShowWarning] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const { t } = useTranslation();
  const { toast } = useToast();

  const resetTimer = useCallback(() => {
    setLastActivity(Date.now());
    if (showWarning) {
      setShowWarning(false);
    }
  }, [showWarning]);

  useEffect(() => {
    // Setup event listeners for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const handleActivity = () => resetTimer();
    
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [resetTimer]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeIdle = now - lastActivity;

      if (timeIdle >= IDLE_TIMEOUT_MS) {
        // Log out immediately
        handleLogout();
      } else if (timeIdle >= IDLE_TIMEOUT_MS - WARNING_BEFORE_MS && !showWarning) {
        // Show warning modal
        setShowWarning(true);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [lastActivity, showWarning]);

  const handleLogout = async () => {
    const sessionId = localStorage.getItem('farmwise-session-id');
    if (sessionId) {
      try {
        await fetch('/api/farmers/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });
      } catch (e) {
        console.warn("Logout history update error", e);
      }
    }

    // Attempt Supabase signout if client is configured
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Supabase auth signout failed", e);
    }
    
    // Clear local storage session
    localStorage.removeItem('farmwise-farmer');
    localStorage.removeItem('farmwise-session-id');
    localStorage.removeItem('supabase.auth.token');
    
    setShowWarning(false);
    onLogout();
    
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully.",
      variant: "default"
    });
  };

  const stayLoggedIn = () => {
    resetTimer();
  };

  return { showWarning, stayLoggedIn, handleLogout };
}
