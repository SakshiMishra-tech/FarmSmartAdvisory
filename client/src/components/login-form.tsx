import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Leaf, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { insertFarmerSchema, getStates, getDistrictsByState } from '@shared/schema';
import { getLocalizedStateName, getLocalizedDistrictName } from '@/lib/utils';
import { transliterateInput } from '@/lib/transliteration';

interface LoginFormProps {
  onLogin: (farmer: any) => void;
  onBack: () => void;
}

const states = getStates();

export function LoginForm({ onLogin, onBack }: LoginFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const selectedLanguage = localStorage.getItem('farmwise-language') || 'en';
  const [formData, setFormData] = useState({
    phone: '',
    name: '',
    state: '',
    district: ''
  });
  const [districts, setDistricts] = useState<string[]>([]);
  const [phoneError, setPhoneError] = useState('');
  
  // Update districts when state changes
  useEffect(() => {
    if (formData.state) {
      const stateDistricts = getDistrictsByState(formData.state);
      setDistricts(stateDistricts.map(d => d.charAt(0).toUpperCase() + d.slice(1)));
      // Reset district if it's not in the new state
      if (formData.district && !stateDistricts.includes(formData.district.toLowerCase())) {
        setFormData(prev => ({ ...prev, district: '' }));
      }
    }
  }, [formData.state]);

  const loginMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/farmers/login', data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: t('toast.loginSuccess'),
          description: t('toast.loginWelcome'),
        });
        onLogin(data.farmer);
      } else {
        throw new Error(data.error || 'Login failed');
      }
    },
    onError: (error) => {
        toast({
        title: t('toast.loginFailed'),
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = formData.phone.replace(/[\s-]/g, '');

    if (!/^(?:\+91)?[6-9]\d{9}$/.test(cleanPhone)) {
      setPhoneError(t('toast.phoneInvalid'));
      toast({
        title: t('toast.validationError'),
        description: t('toast.phoneInvalid'),
        variant: "destructive",
      });
      return;
    }
    
    console.log('Form data before validation:', formData);
    
    try {
      const validatedData = insertFarmerSchema.parse({
        ...formData,
        phone: cleanPhone,
        language: localStorage.getItem('farmwise-language') || 'en'
      });
      
      console.log('Validated data:', validatedData);
      loginMutation.mutate(validatedData);
    } catch (error) {
      console.error('Validation error:', error);
      toast({
        title: t('toast.validationError'),
        description: t('toast.validationRequired'),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mb-4"
          data-testid="button-back-language"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('button.back')}
        </Button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-xl mx-auto mb-4 flex items-center justify-center">
            <Leaf className="text-primary-foreground w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold" data-testid="login-title">
            {t('login.welcome')}
          </h1>
          <p className="text-muted-foreground" data-testid="login-subtitle">
            {t('app.description')}
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="phone" data-testid="label-phone">
                  {t('login.phone')}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 9876543210"
                  value={formData.phone}
                  onChange={(e) => {
                    setPhoneError('');
                    setFormData(prev => ({ ...prev, phone: e.target.value }));
                  }}
                  required
                  data-testid="input-phone"
                />
                {phoneError && (
                  <p className="mt-1 text-xs text-destructive" data-testid="phone-error">
                    {phoneError}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="name" data-testid="label-name">
                  {t('login.name')}
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder={t('placeholder.name')}
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: transliterateInput(e.target.value, selectedLanguage) }))}
                  required
                  data-testid="input-name"
                />
              </div>
              
              <div>
                <Label htmlFor="state" data-testid="label-state">
                  {t('login.state')}
                </Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, state: value, district: '' }))}
                  required
                >
                  <SelectTrigger data-testid="select-state">
                    <SelectValue placeholder={t('placeholder.selectState')} />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((state) => (
                      <SelectItem key={state} value={state}>
                        {t(getLocalizedStateName(state, selectedLanguage))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="district" data-testid="label-district">
                  {t('login.district')}
                </Label>
                <Select
                  value={formData.district}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, district: value }))}
                  required
                  disabled={!formData.state}
                >
                  <SelectTrigger data-testid="select-district">
                    <SelectValue placeholder={formData.state ? t('placeholder.selectDistrict') : t('placeholder.selectStateFirst')} />
                  </SelectTrigger>
                  <SelectContent>
                    {districts.map((district) => (
                      <SelectItem key={district} value={district}>
                        {t(getLocalizedDistrictName(district, selectedLanguage))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={loginMutation.isPending}
                data-testid="button-login"
              >
                {loginMutation.isPending ? t('loading.login') : t('login.continue')}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
            <ShieldCheck className="w-4 h-4" />
            <span data-testid="security-note">{t('login.secure')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
