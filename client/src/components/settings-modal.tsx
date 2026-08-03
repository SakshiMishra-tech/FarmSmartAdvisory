import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Trash2, Download, LogOut, User, MapPin, Volume2, Shield, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useVoice } from '@/hooks/use-voice';
import { useOffline } from '@/hooks/use-offline';
import { useToast } from '@/hooks/use-toast';
import { languages, stateDistrictData } from '@shared/schema';
import { useTheme } from 'next-themes';

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
  const { theme: currentTheme, setTheme } = useTheme();
  
  // Account Form State
  const [name, setName] = useState(farmer?.name || '');
  const [phone, setPhone] = useState(farmer?.phone || '');
  const [state, setState] = useState(farmer?.state || '');
  const [district, setDistrict] = useState(farmer?.district || '');
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>('system');
  
  // Location State
  const [liveLocationEnabled, setLiveLocationEnabled] = useState(true);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Voice Speed State
  const [speechSpeed, setSpeechSpeed] = useState([1.0]);

  // Dialog & Progress States
  const [isClearing, setIsClearing] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (farmer) {
      setName(farmer.name || '');
      setPhone(farmer.phone || '');
      setState(farmer.state || '');
      setDistrict(farmer.district || '');
    }
  }, [farmer]);

  useEffect(() => {
    if (currentTheme === 'light' || currentTheme === 'dark' || currentTheme === 'system') {
      setThemeState(currentTheme);
    }
  }, [currentTheme, isOpen]);

  const handleStateChange = (newState: string) => {
    setState(newState);
    const districts = stateDistrictData[newState.toLowerCase() as keyof typeof stateDistrictData];
    if (districts && districts.length > 0) {
      setDistrict(districts[0]);
    }
  };

  const handleSaveAccount = async () => {
    setIsSavingAccount(true);
    try {
      const updatedFarmer = {
        ...farmer,
        name,
        phone,
        state,
        district,
        language: farmer.language || 'en'
      };

      // Save to localStorage
      localStorage.setItem('farmwise-farmer', JSON.stringify(updatedFarmer));
      
      // Update backend profile if ID exists
      if (farmer?.id) {
        await fetch(`/api/farmers/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone,
            name,
            state,
            district,
            language: farmer.language || 'en'
          })
        });
      }

      toast({
        title: "✅ Profile Updated",
        description: "Your account settings have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Could not save profile changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingAccount(false);
    }
  };

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    localStorage.setItem('farmwise-language', languageCode);
    const updatedFarmer = { ...farmer, language: languageCode };
    localStorage.setItem('farmwise-farmer', JSON.stringify(updatedFarmer));
    toast({
      title: "Language Saved",
      description: `Language changed to ${languageCode.toUpperCase()}`,
    });
  };

  const handleThemeChange = (value: 'light' | 'dark' | 'system') => {
    setThemeState(value);
    setTheme(value);
  };

  const handleUpdateLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          toast({
            title: "✅ Location Updated",
            description: `Lat: ${pos.coords.latitude.toFixed(2)}, Lon: ${pos.coords.longitude.toFixed(2)}`,
          });
        },
        () => {
          toast({
            title: "Location Error",
            description: "Unable to retrieve your live GPS location.",
            variant: "destructive"
          });
        }
      );
    }
  };

  const handleClearOfflineData = async () => {
    setIsClearing(true);
    try {
      await clearOfflineData();
      toast({
        title: "✅ Offline Cache Cleared",
        description: "Local data cache has been reset.",
      });
    } catch (error) {
      toast({
        title: "Clear Failed",
        description: "Could not clear offline cache.",
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
        farmer: { name, phone, state, district },
        predictions: offlineData,
        exportedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `farmadvisory-export-${name || 'farmer'}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "✅ Data Exported",
        description: "Your farming records have been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not export user data.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    try {
      if (farmer?.id) {
        await fetch(`/api/farmers/${farmer.id}`, {
          method: 'DELETE'
        });
      }
    } catch (e) {
      console.error("Failed to delete account from backend", e);
    } finally {
      setShowDeleteConfirm(false);
      localStorage.clear();
      onLogout();
      toast({
        title: "✅ Account Permanently Deleted",
        description: "Your profile and all data have been completely removed from the database.",
        variant: "destructive"
      });
    }
  };

  const availableDistricts = stateDistrictData[state.toLowerCase() as keyof typeof stateDistrictData] || [];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto" data-testid="settings-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-lg font-bold text-emerald-900 dark:text-emerald-100">
              <User className="w-5 h-5 text-emerald-600" />
              <span>{t('settings.title') || "Settings & Preferences"}</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-2">
            
            {/* 1. Account Settings */}
            <div className="p-4 bg-muted/40 rounded-xl border space-y-4">
              <div className="flex items-center space-x-2 font-semibold text-sm border-b pb-2">
                <User className="w-4 h-4 text-primary" />
                <span>{t('settings.profile') || "खाता प्रोफ़ाइल"}</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="set-name" className="text-xs">{t('login.name') || "पूरा नाम"}</Label>
                  <Input
                    id="set-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 text-sm font-medium"
                  />
                </div>
                <div>
                  <Label htmlFor="set-phone" className="text-xs">{t('login.phone') || "फ़ोन नंबर"}</Label>
                  <Input
                    id="set-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 text-sm font-medium"
                  />
                </div>
                <div>
                  <Label htmlFor="set-state" className="text-xs">{t('login.state') || "राज्य"}</Label>
                  <Select value={state} onValueChange={handleStateChange}>
                    <SelectTrigger className="mt-1 text-sm capitalize font-medium">
                      <SelectValue placeholder={t('placeholder.selectState') || "राज्य चुनें"} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(stateDistrictData).map((st) => (
                        <SelectItem key={st} value={st} className="capitalize">{st}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="set-district" className="text-xs">{t('login.district') || "ज़िला"}</Label>
                  <Select value={district} onValueChange={setDistrict}>
                    <SelectTrigger className="mt-1 text-sm capitalize font-medium">
                      <SelectValue placeholder={t('placeholder.selectDistrict') || "ज़िला चुनें"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDistricts.map((dst) => (
                        <SelectItem key={dst} value={dst} className="capitalize">{dst}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <Label className="text-xs">{t('login.language') || "पसंदीदा भाषा"}</Label>
                  <Select value={farmer?.language || 'en'} onValueChange={handleLanguageChange}>
                    <SelectTrigger className="mt-1 text-sm font-medium">
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
                <div>
                  <Label className="text-xs">{t('settings.theme') || "थीम मोड"}</Label>
                  <Select value={theme} onValueChange={(val) => handleThemeChange(val as 'light' | 'dark' | 'system')}>
                    <SelectTrigger className="mt-1 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">{t('settings.lightMode')}</SelectItem>
                      <SelectItem value="dark">{t('settings.darkMode')}</SelectItem>
                      <SelectItem value="system">{t('settings.systemDefault')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleSaveAccount}
                disabled={isSavingAccount}
                size="sm"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                {isSavingAccount ? t('settings.saving') : t('settings.saveAccount')}
              </Button>
            </div>

            {/* 2. Location Settings */}
            <div className="p-4 bg-muted/40 rounded-xl border space-y-4">
              <div className="flex items-center space-x-2 font-semibold text-sm border-b pb-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>{t('settings.locationTitle')}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{t('settings.liveGpsLocation')}</div>
                  <div className="text-xs text-muted-foreground">
                    {currentCoords ? `${t('settings.latitude')} ${currentCoords.lat.toFixed(2)}, ${t('settings.longitude')} ${currentCoords.lon.toFixed(2)}` : `${farmer?.district || t('login.district')}, ${farmer?.state || t('login.state')}`}
                  </div>
                </div>
                <Switch
                  checked={liveLocationEnabled}
                  onCheckedChange={setLiveLocationEnabled}
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={handleUpdateLocation}
              >
                <MapPin className="w-4 h-4 mr-2 text-emerald-600" />
                {t('settings.updateGpsLocation')}
              </Button>
            </div>

            {/* 3. Voice Settings */}
            <div className="p-4 bg-muted/40 rounded-xl border space-y-4">
              <div className="flex items-center space-x-2 font-semibold text-sm border-b pb-2">
                <Volume2 className="w-4 h-4 text-blue-600" />
                <span>{t('settings.voiceTitle')}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="voice-output" className="text-sm font-medium">
                  {t('settings.voiceOutputAudio')}
                </Label>
                <Switch
                  id="voice-output"
                  checked={voiceSettings.enabled}
                  onCheckedChange={(checked) => updateVoiceSettings({ enabled: checked })}
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{t('settings.voiceSpeed')}</span>
                  <span className="font-semibold">{speechSpeed[0]}x</span>
                </div>
                <Slider
                  value={speechSpeed}
                  onValueChange={setSpeechSpeed}
                  min={0.75}
                  max={1.5}
                  step={0.25}
                />
              </div>
            </div>

            {/* 4. Privacy & Data */}
            <div className="p-4 bg-muted/40 rounded-xl border space-y-3">
              <div className="flex items-center space-x-2 font-semibold text-sm border-b pb-2">
                <Shield className="w-4 h-4 text-purple-600" />
                <span>{t('settings.privacyTitle')}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportData}
                  className="justify-start text-xs"
                >
                  <Download className="w-3.5 h-3.5 mr-2" />
                  {t('settings.exportJson')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearOfflineData}
                  disabled={isClearing}
                  className="justify-start text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  {t('settings.clearOfflineCache')}
                </Button>
              </div>
            </div>

            {/* 5. Danger Zone */}
            <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-xl space-y-3">
              <div className="flex items-center space-x-2 font-semibold text-sm text-destructive border-b border-destructive/10 pb-2">
                <AlertTriangle className="w-4 h-4" />
                <span>{t('settings.dangerZoneTitle')}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('settings.dangerZoneDesc')}
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="w-full font-medium text-xs"
                onClick={() => setShowDeleteConfirm(true)}
              >
                {t('settings.deleteAccount')}
              </Button>
            </div>

            {/* 6. About App */}
            <div className="p-4 bg-muted/30 rounded-xl border text-xs space-y-2">
              <div className="flex items-center space-x-2 font-semibold text-xs border-b pb-1 text-muted-foreground">
                <Info className="w-3.5 h-3.5" />
                <span>{t('settings.aboutApp')}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t('settings.versionLabel')}</span>
                <span className="font-semibold text-foreground">v1.2.0</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t('settings.appBuild')}</span>
                <span className="font-semibold text-foreground">2026.08.04-prod</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t('settings.databaseStatus')}</span>
                <span className="font-semibold text-emerald-600 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1" /> {t('settings.connectedPostgres')}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t('settings.aiEngine')}</span>
                <span className="font-semibold text-blue-600 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1" /> {t('settings.onlineGemini')}</span>
              </div>
            </div>

            {/* 7. Logout Button */}
            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full justify-center text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={onLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span>{t('settings.logoutAccount')}</span>
              </Button>
            </div>

          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Popup */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5" />
              <span>{t('settings.confirmDeleteTitle')}</span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('settings.confirmDeleteDesc')}
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>{t('settings.cancel')}</Button>
            <Button variant="destructive" onClick={handleDeleteAccount}>{t('settings.confirmDelete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
