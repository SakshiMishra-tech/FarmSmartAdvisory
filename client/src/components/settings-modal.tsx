import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, Download, X, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useVoice } from '@/hooks/use-voice';
import { useOffline } from '@/hooks/use-offline';
import { useToast } from '@/hooks/use-toast';
import { languages } from '@shared/schema';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmer: any;
  onLogout: () => void;
}

export function SettingsModal({ isOpen, onClose, farmer, onLogout }: SettingsModalProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { settings: voiceSettings, updateSettings: updateVoiceSettings } = useVoice();
  const { clearOfflineData, getOfflineData } = useOffline();
  const [isClearing, setIsClearing] = useState(false);

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    localStorage.setItem('farmwise-language', languageCode);
    
    // Update farmer language preference
    const updatedFarmer = { ...farmer, language: languageCode };
    localStorage.setItem('farmwise-farmer', JSON.stringify(updatedFarmer));
    
    toast({
      title: "Language Updated",
      description: "Language preference has been saved.",
    });
  };

  const handleClearOfflineData = async () => {
    setIsClearing(true);
    try {
      await clearOfflineData();
      toast({
        title: "Data Cleared",
        description: "Offline data has been cleared successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear offline data.",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleExportData = async () => {
    try {
      const offlineData = await getOfflineData();
      const exportData = {
        farmer: {
          name: farmer.name,
          phone: farmer.phone,
          district: farmer.district
        },
        predictions: offlineData,
        exportedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `farmwise-export-${farmer.name}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Data Exported",
        description: "Your data has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="settings-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span data-testid="settings-title">{t('settings.title')}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              data-testid="button-close-settings"
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Voice Settings */}
          <div>
            <h3 className="text-sm font-medium mb-3" data-testid="voice-section-title">
              {t('settings.voice')}
            </h3>
            <div className="flex items-center justify-between">
              <Label htmlFor="voice-output" data-testid="voice-output-label">
                {t('settings.voiceOutput')}
              </Label>
              <Switch
                id="voice-output"
                checked={voiceSettings.enabled}
                onCheckedChange={(checked) => updateVoiceSettings({ enabled: checked })}
                data-testid="switch-voice-output"
              />
            </div>
          </div>

          {/* Language Settings */}
          <div>
            <h3 className="text-sm font-medium mb-3" data-testid="language-section-title">
              {t('settings.language')}
            </h3>
            <Select
              value={farmer.language || 'en'}
              onValueChange={handleLanguageChange}
            >
              <SelectTrigger data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((language) => (
                  <SelectItem key={language.code} value={language.code}>
                    {language.native} ({language.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data Management */}
          <div>
            <h3 className="text-sm font-medium mb-3" data-testid="data-section-title">
              {t('settings.dataManagement')}
            </h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleClearOfflineData}
                disabled={isClearing}
                data-testid="button-clear-data"
              >
                <Trash2 className="w-4 h-4 mr-3" />
                <div className="text-left">
                  <div className="text-sm font-medium">{t('settings.clearData')}</div>
                  <div className="text-xs text-muted-foreground">
                    {t('settings.clearDataDesc')}
                  </div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleExportData}
                data-testid="button-export-data"
              >
                <Download className="w-4 h-4 mr-3" />
                <div className="text-left">
                  <div className="text-sm font-medium">{t('settings.exportData')}</div>
                  <div className="text-xs text-muted-foreground">
                    {t('settings.exportDataDesc')}
                  </div>
                </div>
              </Button>
            </div>
          </div>

          {/* Account Management */}
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={onLogout}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-3" />
              <span>Logout</span>
            </Button>
          </div>

          {/* App Info */}
          <div className="pt-4 border-t text-center">
            <p className="text-xs text-muted-foreground" data-testid="app-version">
              FarmWise v1.0.0
            </p>
            <p className="text-xs text-muted-foreground" data-testid="model-accuracy">
              ML Model Accuracy: 99.45%
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
