import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Leaf, ShieldCheck, CheckCircle2, Lock } from 'lucide-react';
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
            title: "Welcome Back!",
            description: `Account found for +91 ${cleanPhone}. Your State is saved, you can update your District if needed.`,
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
    
    if (formData.phone.length !== 10) {
      setPhoneError("Please enter a valid 10-digit mobile number");
      return;
    }

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
          language: formData.language
        })
      });

      const result = await res.json();
      if (result.success) {
        onLogin(result.farmer);
        toast({ title: t('toast.loginSuccess') || "Logged in successfully!" });
      } else {
        throw new Error(result.error || "Failed to log in profile");
      }
    } catch (error: any) {
      console.error('Authentication Error:', error);
      toast({
        title: "Login Failed",
        description: error.message || "An error occurred during login.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-xl mx-auto mb-4 flex items-center justify-center shadow-lg">
            <Leaf className="text-primary-foreground w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">FarmWise</h1>
          <p className="text-muted-foreground mt-1">{t('app.description') || "Your Smart Crop & Agricultural Advisory"}</p>
        </div>

        <Card className="border shadow-md">
          <CardContent className="p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              
              {/* Phone Number Field */}
              <div>
                <Label htmlFor="phone">{t('login.phone') || "Phone Number"}</Label>
                <div className="flex mt-1.5 rounded-md border border-input bg-transparent shadow-sm focus-within:ring-1 focus-within:ring-ring">
                  <div className="flex items-center px-3 border-r bg-muted/30 text-muted-foreground text-sm select-none font-medium">
                    +91 <span className="mx-2 text-border">|</span>
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="9876543210"
                    className="border-0 focus-visible:ring-0 rounded-l-none shadow-none text-base"
                    value={formData.phone}
                    maxLength={10}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    required
                  />
                </div>
                {phoneError && <p className="mt-1.5 text-xs text-destructive font-medium">{phoneError}</p>}
                {isCheckingPhone && <p className="mt-1 text-xs text-muted-foreground">Checking phone registration...</p>}
                {isExistingUser && (
                  <div className="mt-2 flex items-center text-xs text-emerald-6-00 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600 shrink-0" />
                    <span>Existing account detected. State is locked.</span>
                  </div>
                )}
              </div>

              {/* Full Name */}
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g. Sakshi Mishra"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              {/* Email (Optional) */}
              <div>
                <div className="flex justify-between items-center">
                  <Label htmlFor="email">Email</Label>
                  <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="farmer@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>

              {/* State (Disabled/Locked if existing account) */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <Label htmlFor="state">{t('login.state') || "State"}</Label>
                  {isExistingUser && (
                    <span className="text-xs text-muted-foreground flex items-center">
                      <Lock className="w-3 h-3 mr-1" /> Account Locked
                    </span>
                  )}
                </div>
                <Select
                  value={formData.state}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, state: value, district: '' }))}
                  required
                  disabled={isExistingUser}
                >
                  <SelectTrigger id="state">
                    <SelectValue placeholder={t('placeholder.selectState') || "Select State"} />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((state) => (
                      <SelectItem key={state} value={state}>
                        {t(getLocalizedStateName(state, formData.language))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* District (Editable) */}
              <div>
                <Label htmlFor="district">{t('login.district') || "District"}</Label>
                <Select
                  value={formData.district}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, district: value }))}
                  required
                  disabled={!formData.state}
                >
                  <SelectTrigger id="district">
                    <SelectValue placeholder={formData.state ? (t('placeholder.selectDistrict') || "Select District") : (t('placeholder.selectStateFirst') || "Select State First")} />
                  </SelectTrigger>
                  <SelectContent>
                    {districts.map((district) => (
                      <SelectItem key={district} value={district}>
                        {t(getLocalizedDistrictName(district, formData.language))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Preferred Language */}
              <div>
                <Label htmlFor="language">Preferred Language</Label>
                <Select
                  value={formData.language}
                  onValueChange={handleLanguageChange}
                  required
                >
                  <SelectTrigger id="language">
                    <SelectValue placeholder="Select Language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.native} ({lang.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Single Login Button */}
              <Button type="submit" className="w-full mt-4 h-11 text-base font-semibold" disabled={isLoading}>
                {isLoading ? "Logging in..." : "LOGIN"}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Your data is secure and stored safely</span>
          </div>
        </div>
      </div>
    </div>
  );
}
