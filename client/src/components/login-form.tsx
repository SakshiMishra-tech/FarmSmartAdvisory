import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Leaf, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { getStates, getDistrictsByState, languages } from '@shared/schema';
import { getLocalizedStateName, getLocalizedDistrictName } from '@/lib/utils';
import i18n from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

interface LoginFormProps {
  onLogin: (farmer: any) => void;
  authUser: any;
}

const states = getStates();

export function LoginForm({ onLogin, authUser }: LoginFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'complete-profile'>('login');
  const [password, setPassword] = useState('');

  const [formData, setFormData] = useState({
    phone: '',
    name: '',
    email: '',
    state: '',
    district: '',
    language: localStorage.getItem('farmwise-language') || 'en'
  });
  
  const [districts, setDistricts] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (authUser) {
      setAuthMode('complete-profile');
      setFormData(prev => ({
        ...prev,
        name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || prev.name,
        email: authUser.email || prev.email,
      }));
    } else {
      setAuthMode('login');
    }
  }, [authUser]);

  const validateForm = () => {
    const errs: Record<string, string> = {};

    if (authMode === 'login' || authMode === 'signup') {
      if (!formData.email || !formData.email.includes('@')) {
        errs.email = "Please enter a valid email address.";
      }
      if (!password || password.length < 6) {
        errs.password = "Password must be at least 6 characters long.";
      }
    }

    if (authMode === 'signup' || authMode === 'complete-profile') {
      if (!formData.phone || formData.phone.length !== 10) {
        errs.phone = t('toast.phoneInvalid') || "Enter a valid 10 digit Indian mobile number.";
      }
      if (!formData.name || formData.name.trim() === '') {
        errs.name = t('validation.enterName') || "कृपया पूरा नाम दर्ज करें।";
      }
      if (!formData.state) {
        errs.state = t('validation.selectState') || "कृपया राज्य चुनें।";
      }
      if (!formData.district) {
        errs.district = t('validation.selectDistrict') || "कृपया जिला चुनें।";
      }
    }

    setFormErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast({
        title: t('toast.validationError') || "Validation Error",
        description: t('toast.validationRequired') || "Please fill in all required fields correctly.",
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

  const handleLanguageChange = (lang: string) => {
    setFormData(prev => ({ ...prev, language: lang }));
    localStorage.setItem('farmwise-language', lang);
    i18n.changeLanguage(lang);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw new Error(error.message);
    } catch (error: any) {
      toast({
        title: "Google Login Failed",
        description: error.message,
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (authMode === 'login') {
        // Sign in with Supabase Auth
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: password,
        });

        if (error) throw new Error(error.message);
        toast({ title: "Successfully authenticated!" });

      } else if (authMode === 'signup') {
        // Sign up with Supabase Auth
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: password,
          options: {
            data: {
              name: formData.name,
              phone: formData.phone,
              state: formData.state,
              district: formData.district,
              language: formData.language,
            }
          }
        });

        if (error) throw new Error(error.message);

        const userId = data.user?.id;
        if (!userId) throw new Error("Could not retrieve user ID from signup.");

        // Store profile data in localStorage so App.tsx auto-sync picks it up via onAuthStateChange.
        // Do NOT call /api/farmers/login here — that would race with the auto-sync triggered by
        // onAuthStateChange, causing FK constraint violations on tables like weather_lookups.
        const profilePayload = {
          id: userId,
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          state: formData.state,
          district: formData.district,
          language: formData.language,
        };
        localStorage.setItem('farmwise-farmer', JSON.stringify(profilePayload));

        toast({ title: "✅ Account created! Syncing your profile..." });
        // App.tsx onAuthStateChange will fire next and call syncOrFetchProfile,
        // which reads localStorage and syncs the profile to the DB automatically.


      } else if (authMode === 'complete-profile') {
        if (!authUser) throw new Error("No active authenticated session.");

        // Complete user profile syncing it to the Postgres database
        const res = await fetch('/api/farmers/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: authUser.id,
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
          toast({ title: "✅ Profile sync complete!" });
        } else {
          throw new Error(result.error || "Profile completion failed.");
        }
      }
    } catch (error: any) {
      console.error('Authentication Error:', error);
      toast({
        title: t('toast.loginFailed') || "Login Failed",
        description: error.message || t('toast.loginFailedDesc') || "लॉगिन पूरा नहीं हो सका। कृपया पुनः प्रयास करें।",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex items-center justify-center bg-slate-950 relative p-4">
      {/* Background Crop Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center scale-105 filter brightness-75 transition-all"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1920&q=80')` }}
      />
      
      {/* Dark Backdrop Glass Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/90 via-emerald-950/80 to-slate-950/90 backdrop-blur-[4px]" />

      {/* Main Glass Card Container */}
      <div className="relative z-10 w-full max-w-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl border border-white/20 dark:border-slate-800 rounded-3xl p-4 sm:p-5 my-auto max-h-[96vh] overflow-y-auto sm:overflow-visible">
        
        {/* Header */}
        <div className="text-center mb-3 flex items-center justify-center space-x-3">
          <div className="p-2 bg-emerald-600 text-white rounded-2xl shadow-md">
            <Leaf className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
              FarmAdvisory
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
              {t('app.description') || "Your Smart Farming Assistant"}
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        {authMode !== 'complete-profile' && (
          <div className="grid grid-cols-2 gap-2 mb-3 p-1 bg-slate-200 dark:bg-slate-800 rounded-xl">
            <Button
              type="button"
              variant={authMode === 'login' ? 'default' : 'ghost'}
              className="rounded-lg text-xs font-bold h-8 cursor-pointer"
              onClick={() => {
                setFormErrors({});
                setAuthMode('login');
              }}
            >
              Sign In
            </Button>
            <Button
              type="button"
              variant={authMode === 'signup' ? 'default' : 'ghost'}
              className="rounded-lg text-xs font-bold h-8 cursor-pointer"
              onClick={() => {
                setFormErrors({});
                setAuthMode('signup');
              }}
            >
              Register
            </Button>
          </div>
        )}

        {authMode === 'complete-profile' && (
          <div className="mb-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-300 dark:border-emerald-800 text-center">
            <h2 className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              Welcome {formData.name || 'Farmer'}!
            </h2>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
              Please complete your profile to continue to your dashboard.
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-2.5">
          
          {/* Login Mode Fields */}
          {authMode === 'login' && (
            <>
              <div>
                <Label htmlFor="email" className="text-xs font-semibold">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="farmer@example.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormErrors(prev => ({ ...prev, email: '' }));
                    setFormData(prev => ({ ...prev, email: e.target.value }));
                  }}
                  className={`mt-1 rounded-xl text-xs font-medium h-9 ${formErrors.email ? 'border-destructive focus-visible:ring-destructive' : 'focus-visible:ring-emerald-500'}`}
                />
                {formErrors.email && <p className="text-[11px] text-destructive mt-0.5 font-medium">{formErrors.email}</p>}
              </div>

              <div>
                <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => {
                    setFormErrors(prev => ({ ...prev, password: '' }));
                    setPassword(e.target.value);
                  }}
                  className={`mt-1 rounded-xl text-xs font-medium h-9 ${formErrors.password ? 'border-destructive focus-visible:ring-destructive' : 'focus-visible:ring-emerald-500'}`}
                />
                {formErrors.password && <p className="text-[11px] text-destructive mt-0.5 font-medium">{formErrors.password}</p>}
              </div>
            </>
          )}

          {/* Register Mode Fields */}
          {authMode === 'signup' && (
            <>
              {/* Row 1: Email + Phone Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="email" className="text-xs font-semibold">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="farmer@example.com"
                    value={formData.email}
                    onChange={(e) => {
                      setFormErrors(prev => ({ ...prev, email: '' }));
                      setFormData(prev => ({ ...prev, email: e.target.value }));
                    }}
                    className={`mt-1 rounded-xl text-xs font-medium h-9 ${formErrors.email ? 'border-destructive focus-visible:ring-destructive' : 'focus-visible:ring-emerald-500'}`}
                  />
                  {formErrors.email && <p className="text-[11px] text-destructive mt-0.5 font-medium">{formErrors.email}</p>}
                </div>

                <div>
                  <Label htmlFor="phone" className="text-xs font-semibold">{t('login.phone') || "Phone Number"}</Label>
                  <div className={`flex mt-1 rounded-xl border bg-background/80 shadow-sm ${
                    formErrors.phone ? 'border-destructive ring-1 ring-destructive' : 'border-input focus-within:ring-2 focus-within:ring-emerald-500'
                  }`}>
                    <div className="flex items-center px-2.5 border-r bg-muted/40 text-muted-foreground text-xs font-bold rounded-l-xl select-none">
                      +91
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="9876543210"
                      className="border-0 focus-visible:ring-0 rounded-l-none shadow-none text-xs font-medium h-9"
                      value={formData.phone}
                      maxLength={10}
                      onChange={(e) => {
                        setFormErrors(prev => ({ ...prev, phone: '' }));
                        const clean = e.target.value.replace(/\D/g, '');
                        setFormData(prev => ({ ...prev, phone: clean }));
                      }}
                    />
                  </div>
                  {formErrors.phone && (
                    <p className="text-[11px] text-destructive mt-0.5 font-medium">{formErrors.phone}</p>
                  )}
                </div>
              </div>

              {/* Row 2: Password + Full Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => {
                      setFormErrors(prev => ({ ...prev, password: '' }));
                      setPassword(e.target.value);
                    }}
                    className={`mt-1 rounded-xl text-xs font-medium h-9 ${formErrors.password ? 'border-destructive focus-visible:ring-destructive' : 'focus-visible:ring-emerald-500'}`}
                  />
                  {formErrors.password && <p className="text-[11px] text-destructive mt-0.5 font-medium">{formErrors.password}</p>}
                </div>

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
              </div>

              {/* Row 3: State + District */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="state" className="text-xs font-semibold">{t('login.state') || "State"}</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) => {
                      setFormErrors(prev => ({ ...prev, state: '' }));
                      setFormData(prev => ({ ...prev, state: value, district: '' }));
                    }}
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

              {/* Row 4: Preferred Language */}
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
            </>
          )}

          {/* Complete Profile Mode Fields */}
          {authMode === 'complete-profile' && (
            <>
              {/* Row 1: Full Name + Phone Number */}
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
                  <Label htmlFor="phone" className="text-xs font-semibold">{t('login.phone') || "Phone Number"}</Label>
                  <div className={`flex mt-1 rounded-xl border bg-background/80 shadow-sm ${
                    formErrors.phone ? 'border-destructive ring-1 ring-destructive' : 'border-input focus-within:ring-2 focus-within:ring-emerald-500'
                  }`}>
                    <div className="flex items-center px-2.5 border-r bg-muted/40 text-muted-foreground text-xs font-bold rounded-l-xl select-none">
                      +91
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="9876543210"
                      className="border-0 focus-visible:ring-0 rounded-l-none shadow-none text-xs font-medium h-9"
                      value={formData.phone}
                      maxLength={10}
                      onChange={(e) => {
                        setFormErrors(prev => ({ ...prev, phone: '' }));
                        const clean = e.target.value.replace(/\D/g, '');
                        setFormData(prev => ({ ...prev, phone: clean }));
                      }}
                    />
                  </div>
                  {formErrors.phone && (
                    <p className="text-[11px] text-destructive mt-0.5 font-medium">{formErrors.phone}</p>
                  )}
                </div>
              </div>

              {/* Row 2: State + District */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="state" className="text-xs font-semibold">{t('login.state') || "State"}</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) => {
                      setFormErrors(prev => ({ ...prev, state: '' }));
                      setFormData(prev => ({ ...prev, state: value, district: '' }));
                    }}
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

              {/* Row 3: Preferred Language */}
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
            </>
          )}

          {/* Action Button */}
          <Button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold h-9 text-xs shadow-md rounded-xl transition-all mt-1 cursor-pointer"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                {authMode === 'login' ? "Signing In..." : authMode === 'signup' ? "Registering..." : "Completing Profile..."}
              </span>
            ) : (
              authMode === 'login' ? "Sign In" : authMode === 'signup' ? "Register & Continue" : "Complete Profile"
            )}
          </Button>

          {/* Social Sign-In (Only in Login Mode) */}
          {authMode === 'login' && (
            <>
              <div className="relative my-3 flex items-center justify-center">
                <span className="absolute w-full border-t border-slate-200 dark:border-slate-800" />
                <span className="relative z-10 px-3 bg-white dark:bg-slate-900 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  Or continue with
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleLogin}
                className="w-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold h-9 text-xs shadow-sm rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer"
                disabled={isLoading}
              >
                <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                <span>Google</span>
              </Button>
            </>
          )}

          {/* Cancel/Sign-Out Link for Complete Profile */}
          {authMode === 'complete-profile' && (
            <div className="text-center mt-1">
              <Button
                type="button"
                variant="link"
                onClick={async () => {
                  await supabase.auth.signOut();
                  setAuthMode('login');
                }}
                className="text-xs text-rose-500 hover:text-rose-600 font-semibold cursor-pointer underline h-auto p-0"
              >
                Sign out of this account
              </Button>
            </div>
          )}
        </form>

        {/* Security Footer */}
        <div className="mt-2 text-center">
          <div className="flex items-center justify-center space-x-1.5 text-[10px] text-muted-foreground">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>{t('login.secure')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
