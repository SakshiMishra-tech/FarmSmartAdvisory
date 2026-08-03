import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Leaf, ShieldCheck, CheckCircle2, Lock, Sparkles, Sun, Bot, Wheat } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { getStates, getDistrictsByState, languages } from '@shared/schema';
import { getLocalizedStateName, getLocalizedDistrictName } from '@/lib/utils';
import i18n from '@/lib/i18n';

interface LoginFormProps {
  onLogin: (farmer: any) => void;
}

const states = getStates();

export function LoginForm({ onLogin }: LoginFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [isExistingUser, setIsExistingUser] = useState(false);

  const [formData, setFormData] = useState({
    phone: '',
    name: '',
    email: '',
    state: '',
    district: '',
    language: localStorage.getItem('farmwise-language') || 'en'
  });
  
  const [districts, setDistricts] = useState<string[]>([]);
  const [phoneError, setPhoneError] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!formData.phone || formData.phone.length !== 10) errs.phone = t('toast.phoneInvalid');
    if (!formData.name || formData.name.trim() === '') errs.name = t('validation.enterName') || "कृपया पूरा नाम दर्ज करें।";
    if (!formData.state) errs.state = t('validation.selectState') || "कृपया राज्य चुनें।";
    if (!formData.district) errs.district = t('validation.selectDistrict') || "कृपया जिला चुनें।";

    setFormErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast({
        title: t('toast.validationError'),
        description: t('toast.validationRequired'),
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  // Update district options when state changes
  useEffect(() => {
    if (formData.state) {
      const stateDistricts = getDistrictsByState(formData.state);
      setDistricts(stateDistricts.map(d => d.charAt(0).toUpperCase() + d.slice(1)));
      if (formData.district && !stateDistricts.includes(formData.district.toLowerCase())) {
        setFormData(prev => ({ ...prev, district: '' }));
      }
    }
  }, [formData.state]);

  // Check phone number on typing 10 digits
  const handlePhoneChange = async (value: string) => {
    const cleanPhone = value.replace(/\D/g, '');
    setPhoneError('');
    setFormData(prev => ({ ...prev, phone: cleanPhone }));

    if (cleanPhone.length === 10) {
      setIsCheckingPhone(true);
      try {
        const res = await fetch(`/api/farmers/phone/${cleanPhone}`);
        const data = await res.json();
        if (data.exists && data.farmer) {
          const f = data.farmer;
          setIsExistingUser(true);
          
          // Match state name format
          const matchedState = states.find(s => s.toLowerCase() === f.state.toLowerCase()) || f.state;

          setFormData(prev => ({
            ...prev,
            name: f.name || prev.name,
            email: f.email || '',
            state: matchedState,
            district: f.district ? f.district.charAt(0).toUpperCase() + f.district.slice(1) : '',
            language: f.language || prev.language
          }));

          if (f.language) {
            handleLanguageChange(f.language);
          }

          toast({
            title: t('toast.welcomeBack') || "वापस स्वागत है!",
            description: t('toast.accountFound') || `+91 ${cleanPhone} के लिए खाता मिला।`,
          });
        } else {
          setIsExistingUser(false);
        }
      } catch (err) {
        console.error("Error looking up phone:", err);
      } finally {
        setIsCheckingPhone(false);
      }
    } else {
      if (isExistingUser) {
        setIsExistingUser(false);
      }
    }
  };

  const handleLanguageChange = (lang: string) => {
    setFormData(prev => ({ ...prev, language: lang }));
    localStorage.setItem('farmwise-language', lang);
    i18n.changeLanguage(lang);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const res = await fetch('/api/farmers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formData.phone,
          name: formData.name,
          email: formData.email,
          state: formData.state,
          district: formData.district,
          language: formData.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
          networkType: (navigator as any).connection?.effectiveType || null,
          userAgent: navigator.userAgent
        })
      });

      const result = await res.json();
      if (result.success) {
        if (result.sessionId) {
          localStorage.setItem('farmwise-session-id', result.sessionId);
        }
        onLogin(result.farmer);
        toast({ title: "✅ " + t('toast.loginSuccess') });
      } else {
        throw new Error(result.error || t('toast.loginFailed'));
      }
    } catch (error: any) {
      console.error('Authentication Error:', error);
      toast({
        title: t('toast.loginFailed'),
        description: t('toast.loginFailedDesc') || "लॉगिन पूरा नहीं हो सका। कृपया पुनः प्रयास करें।",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetAccount = async () => {
    if (!formData.phone) return;
    try {
      await fetch(`/api/farmers/phone/${formData.phone}`, {
        method: 'DELETE'
      });
      setIsExistingUser(false);
      setFormData(prev => ({
        ...prev,
        name: '',
        email: '',
        state: '',
        district: ''
      }));
      toast({
        title: t('toast.accountReset') || "✅ खाता रीसेट हो गया",
        description: t('toast.accountResetDesc') || "पुराना खाता हटा दिया गया। अब नए सिरे से पंजीकरण करें!",
      });
    } catch (err) {
      console.error("Error resetting account:", err);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex items-center justify-center bg-slate-950 relative p-4">
      {/* Background Crop Image / Video Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center scale-105 filter brightness-75 transition-all"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1920&q=80')` }}
      />
      
      {/* Dark Backdrop Glass Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/90 via-emerald-950/80 to-slate-950/90 backdrop-blur-[4px]" />

      {/* Main Glass Card Container */}
      <div className="relative z-10 w-full max-w-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl border border-white/20 dark:border-slate-800 rounded-3xl p-5 sm:p-6 my-auto">
        
        {/* Header */}
        <div className="text-center mb-4 flex items-center justify-center space-x-3">
          <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-md">
            <Leaf className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
              FarmAdvisory
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
              {t('app.description') || "Your Smart Farming Assistant"}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-3">
          
          {/* Phone Number Field */}
          <div>
            <Label htmlFor="phone" className="text-xs font-semibold">{t('login.phone') || "Phone Number"}</Label>
            <div className={`flex mt-1 rounded-xl border bg-background/80 shadow-sm ${
              formErrors.phone ? 'border-destructive ring-1 ring-destructive' : 'border-input focus-within:ring-2 focus-within:ring-emerald-500'
            }`}>
              <div className="flex items-center px-3 border-r bg-muted/40 text-muted-foreground text-xs font-bold rounded-l-xl select-none">
                +91 <span className="mx-1.5 text-border">|</span>
              </div>
              <Input
                id="phone"
                type="tel"
                placeholder="9876543210"
                className="border-0 focus-visible:ring-0 rounded-l-none shadow-none text-sm font-medium h-9"
                value={formData.phone}
                maxLength={10}
                onChange={(e) => {
                  setFormErrors(prev => ({ ...prev, phone: '' }));
                  handlePhoneChange(e.target.value);
                }}
              />
            </div>
            {(phoneError || formErrors.phone) && (
              <p className="text-[11px] text-destructive mt-0.5 font-medium">{phoneError || formErrors.phone}</p>
            )}
            {isCheckingPhone && <p className="mt-0.5 text-[11px] text-muted-foreground animate-pulse">{t('login.checkingPhone') || "खाता जांचा जा रहा है..."}</p>}
            {isExistingUser && (
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 p-1.5 px-2.5 rounded-lg border border-emerald-300 font-medium">
                <div className="flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{t('login.existingAccount') || "मौजूदा खाता मिला।"}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetAccount}
                  className="h-5 px-1.5 text-[10px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold underline cursor-pointer"
                >
                  {t('login.startFresh') || "नए सिरे से शुरू करें"}
                </Button>
              </div>
            )}
          </div>

          {/* Full Name & Email Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="name" className="text-xs font-semibold">{t('login.name')}</Label>
              <Input
                id="name"
                type="text"
                placeholder="e.g. Sakshi Mishra"
                value={formData.name}
                onChange={(e) => {
                  setFormErrors(prev => ({ ...prev, name: '' }));
                  setFormData(prev => ({ ...prev, name: e.target.value }));
                }}
                className={`mt-1 rounded-xl text-xs font-medium h-9 ${formErrors.name ? 'border-destructive focus-visible:ring-destructive' : 'focus-visible:ring-emerald-500'}`}
              />
              {formErrors.name && <p className="text-[11px] text-destructive mt-0.5 font-medium">{formErrors.name}</p>}
            </div>

            <div>
              <div className="flex justify-between items-center">
                <Label htmlFor="email" className="text-xs font-semibold">{t('login.email') || "ईमेल"}</Label>
                <span className="text-[10px] text-muted-foreground">({t('login.optional') || "वैकल्पिक"})</span>
              </div>
              <Input
                id="email"
                type="email"
                placeholder="farmer@example.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="mt-1 rounded-xl text-xs font-medium h-9 focus-visible:ring-emerald-500"
              />
            </div>
          </div>

          {/* State & District Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between items-center">
                <Label htmlFor="state" className="text-xs font-semibold">{t('login.state') || "State"}</Label>
                {isExistingUser && (
                  <span className="text-[10px] text-muted-foreground flex items-center">
                    <Lock className="w-2.5 h-2.5 mr-0.5 text-amber-500" /> {t('login.locked') || "लॉक्ड"}
                  </span>
                )}
              </div>
              <Select
                value={formData.state}
                onValueChange={(value) => {
                  setFormErrors(prev => ({ ...prev, state: '' }));
                  setFormData(prev => ({ ...prev, state: value, district: '' }));
                }}
                disabled={isExistingUser}
              >
                <SelectTrigger id="state" className={`mt-1 rounded-xl text-xs font-medium h-9 ${formErrors.state ? 'border-destructive focus:ring-destructive' : 'focus:ring-emerald-500'}`}>
                  <SelectValue placeholder={t('placeholder.selectState') || "Select State"} />
                </SelectTrigger>
                <SelectContent>
                  {states.map((state) => (
                    <SelectItem key={state} value={state} className="text-xs">
                      {t(getLocalizedStateName(state, formData.language))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.state && <p className="text-[11px] text-destructive mt-0.5 font-medium">{formErrors.state}</p>}
            </div>

            <div>
              <Label htmlFor="district" className="text-xs font-semibold">{t('login.district') || "District"}</Label>
              <Select
                value={formData.district}
                onValueChange={(value) => {
                  setFormErrors(prev => ({ ...prev, district: '' }));
                  setFormData(prev => ({ ...prev, district: value }));
                }}
                disabled={!formData.state}
              >
                <SelectTrigger id="district" className={`mt-1 rounded-xl text-xs font-medium h-9 ${formErrors.district ? 'border-destructive focus:ring-destructive' : 'focus:ring-emerald-500'}`}>
                  <SelectValue placeholder={formData.state ? (t('placeholder.selectDistrict') || "Select District") : (t('placeholder.selectStateFirst') || "Select State First")} />
                </SelectTrigger>
                <SelectContent>
                  {districts.map((district) => (
                    <SelectItem key={district} value={district} className="text-xs">
                      {t(getLocalizedDistrictName(district, formData.language))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.district && <p className="text-[11px] text-destructive mt-0.5 font-medium">{formErrors.district}</p>}
            </div>
          </div>

          {/* Preferred Language */}
          <div>
            <Label htmlFor="language" className="text-xs font-semibold">{t('login.language')}</Label>
            <Select
              value={formData.language}
              onValueChange={handleLanguageChange}
            >
              <SelectTrigger id="language" className="mt-1 rounded-xl text-xs font-medium h-9 focus:ring-emerald-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((language) => (
                  <SelectItem key={language.code} value={language.code} className="text-xs">
                    {language.native} ({language.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Single LOGIN Button */}
          <Button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold h-10 text-sm shadow-md rounded-xl transition-all mt-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                {t('loading.login')}
              </span>
            ) : (
              t('login.continue')
            )}
          </Button>
        </form>

        {/* Security Footer */}
        <div className="mt-3 text-center">
          <div className="flex items-center justify-center space-x-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t('login.secure')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
