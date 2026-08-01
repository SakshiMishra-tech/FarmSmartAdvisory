import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Leaf, Volume2, Settings as SettingsIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Navigation } from '@/components/navigation';
import { CropRecommendation } from '@/components/crop-recommendation';
import { YieldPrediction } from '@/components/yield-prediction';
import { CalamityPrediction } from '@/components/calamity-prediction';
import { PredictionHistory } from '@/components/prediction-history';
import { SettingsModal } from '@/components/settings-modal';
import VoiceAssistant from '@/components/voice-assistant';
import { useVoice } from '@/hooks/use-voice';
import { useOffline } from '@/hooks/use-offline';

interface DashboardProps {
  farmer: any;
  onLogout: () => void;
}

export default function Dashboard({ farmer, onLogout }: DashboardProps) {
  const { t, i18n } = useTranslation();
  const { settings: voiceSettings, updateSettings: updateVoiceSettings } = useVoice();
  const { isOnline } = useOffline();
  const [activeTab, setActiveTab] = useState('crop-recommendation');
  const [showSettings, setShowSettings] = useState(false);

  const handleMakePrediction = () => {
    setActiveTab('crop-recommendation');
  };

  const handleLogout = () => {
    localStorage.removeItem('farmwise-farmer');
    localStorage.removeItem('farmwise-language');
    // Reset i18n to default language
    i18n.changeLanguage('en');
    onLogout();
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Top Header */}
      <header className="bg-card border-b px-4 py-3">
        <div className="container mx-auto flex items-center justify-between max-w-6xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Leaf className="text-primary-foreground w-5 h-5" />
            </div>
            <div>
              <h1 className="font-semibold" data-testid="app-title">{t('app.title')}</h1>
              <p className="text-sm text-muted-foreground" data-testid="farmer-name">
                {farmer.name}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateVoiceSettings({ enabled: !voiceSettings.enabled })}
              data-testid="button-toggle-voice"
            >
              <Volume2 className={`w-5 h-5 ${voiceSettings.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="hidden md:flex"
              data-testid="button-open-settings"
            >
              <SettingsIcon className="w-5 h-5" />
            </Button>
            {/* Offline Status Indicator */}
            <div className="flex items-center space-x-1 px-2 py-1 bg-muted rounded-full">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-primary' : 'bg-orange-500'}`} />
              <span className="text-xs text-muted-foreground" data-testid="connection-status">
                {isOnline ? t('status.online') : t('status.offline')}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Main Content Area */}
      <main className="container mx-auto max-w-6xl px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'crop-recommendation' && (
              <CropRecommendation farmer={farmer} />
            )}
            {activeTab === 'yield-prediction' && (
              <YieldPrediction farmer={farmer} />
            )}
            {activeTab === 'calamity-prediction' && (
              <CalamityPrediction farmer={farmer} />
            )}
            {activeTab === 'history' && (
              <PredictionHistory farmer={farmer} onMakePrediction={handleMakePrediction} />
            )}
          </div>
          
          {/* Voice Assistant Sidebar */}
          <div className="lg:col-span-1">
            <VoiceAssistant language={farmer.language || i18n.language || 'en'} onCommand={(command) => {
              console.log('Voice command received:', command);
              // You can add logic here to handle specific voice commands
              // For example, switch tabs based on voice commands
              if (command.toLowerCase().includes('crop') || command.toLowerCase().includes('recommendation')) {
                setActiveTab('crop-recommendation');
              } else if (command.toLowerCase().includes('yield') || command.toLowerCase().includes('prediction')) {
                setActiveTab('yield-prediction');
              } else if (command.toLowerCase().includes('calamity') || command.toLowerCase().includes('disaster') || command.toLowerCase().includes('risk') || command.toLowerCase().includes('weather')) {
                setActiveTab('calamity-prediction');
              } else if (command.toLowerCase().includes('history') || command.toLowerCase().includes('past')) {
                setActiveTab('history');
              }
            }} />
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        farmer={farmer}
        onLogout={handleLogout}
      />
    </div>
  );
}
