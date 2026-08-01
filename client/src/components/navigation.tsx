import { Button } from '@/components/ui/button';
import { Target, TrendingUp, Clock, Settings, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenSettings: () => void;
}

export function Navigation({ activeTab, onTabChange, onOpenSettings }: NavigationProps) {
  const { t } = useTranslation();

  const tabs = [
    { id: 'crop-recommendation', label: t('nav.recommendation'), icon: Target },
    { id: 'yield-prediction', label: t('nav.yield'), icon: TrendingUp },
    { id: 'calamity-prediction', label: t('nav.calamity'), icon: AlertTriangle },
    { id: 'history', label: t('nav.history'), icon: Clock }
  ];

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:block bg-card border-b">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="flex space-x-0">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant="ghost"
                className={`px-6 py-4 font-medium border-b-2 rounded-none ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => onTabChange(tab.id)}
                data-testid={`tab-${tab.id}`}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-10">
        <div className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <Button
                key={tab.id}
                variant="ghost"
                className="flex-1 py-3 px-4 rounded-none flex flex-col items-center justify-center h-16"
                onClick={() => onTabChange(tab.id)}
                data-testid={`nav-${tab.id}`}
              >
                <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className={`text-xs ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {tab.label.split(' ')[0]} {/* Show first word only on mobile */}
                </div>
              </Button>
            );
          })}
          <Button
            variant="ghost"
            className="flex-1 py-3 px-4 rounded-none flex flex-col items-center justify-center h-16"
            onClick={onOpenSettings}
            data-testid="nav-settings"
          >
            <Settings className="w-5 h-5 mb-1 text-muted-foreground" />
            <div className="text-xs text-muted-foreground">{t('nav.settings')}</div>
          </Button>
        </div>
      </nav>
    </>
  );
}
