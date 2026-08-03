import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Sprout } from 'lucide-react';

interface SoilHealthPanelProps {
  onNavigateToSoilHealth: () => void;
  onUseDefaultData: () => void;
}

export function SoilHealthPanel({ onNavigateToSoilHealth, onUseDefaultData }: SoilHealthPanelProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if we should ask today
    const lastAsked = localStorage.getItem('farmwise_shc_last_asked');
    if (lastAsked) {
      const lastAskedDate = new Date(parseInt(lastAsked, 10));
      const today = new Date();
      if (
        lastAskedDate.getDate() === today.getDate() &&
        lastAskedDate.getMonth() === today.getMonth() &&
        lastAskedDate.getFullYear() === today.getFullYear()
      ) {
        return; // Already asked today
      }
    }

    // Show panel after 10 seconds
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  const handleLater = () => {
    localStorage.setItem('farmwise_shc_last_asked', Date.now().toString());
    setIsOpen(false);
  };

  const handleYes = () => {
    onNavigateToSoilHealth();
    setIsOpen(false);
  };

  const handleNo = () => {
    localStorage.setItem('farmwise_shc_last_asked', Date.now().toString());
    onUseDefaultData();
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => {
      if (!open) handleLater();
    }}>
      <SheetContent className="sm:max-w-md border-l shadow-2xl">
        <SheetHeader className="mb-6 mt-4">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Sprout className="w-5 h-5 text-orange-600" />
            </div>
            <SheetTitle className="text-xl">Soil Health Check</SheetTitle>
          </div>
          <SheetDescription className="text-base">
            Do you have a Soil Health Card? We can use it to give you more accurate crop and fertilizer recommendations.
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex flex-col space-y-3 mt-8">
          <Button onClick={handleYes} size="lg" className="w-full bg-green-600 hover:bg-green-700">
            Yes, I have one
          </Button>
          <Button onClick={handleNo} variant="outline" size="lg" className="w-full">
            No, use district averages
          </Button>
          <Button onClick={handleLater} variant="ghost" size="sm" className="w-full mt-4 text-muted-foreground">
            Ask me later
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
