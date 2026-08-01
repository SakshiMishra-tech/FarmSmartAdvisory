import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Leaf } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { languages } from '@shared/schema';

interface LanguageSelectionProps {
  onLanguageSelect: (language: string) => void;
}

export function LanguageSelection({ onLanguageSelect }: LanguageSelectionProps) {
  const { t, i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  const handleLanguageSelect = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    i18n.changeLanguage(languageCode);
  };

  const handleContinue = () => {
    localStorage.setItem('farmwise-language', selectedLanguage);
    onLanguageSelect(selectedLanguage);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md mx-auto text-center">
        {/* App Logo and Title */}
        <div className="mb-8">
          <div className="w-20 h-20 bg-primary rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <Leaf className="text-primary-foreground w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2" data-testid="app-title">
            {t('app.title')}
          </h1>
          <p className="text-muted-foreground" data-testid="app-subtitle">
            {t('app.subtitle')}
          </p>
        </div>
        
        {/* Language Selection */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4" data-testid="language-title">
              {t('language.choose')}
            </h2>
            <p className="text-sm text-muted-foreground mb-6" data-testid="language-subtitle">
              {t('language.chooseHindi')}
            </p>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang.code)}
                  className={`p-3 border rounded-md text-left transition-colors ${
                    selectedLanguage === lang.code
                      ? 'bg-accent text-accent-foreground border-primary'
                      : 'hover:bg-accent hover:text-accent-foreground'
                  }`}
                  data-testid={`language-${lang.code}`}
                >
                  <div className="font-medium">{lang.native}</div>
                  <div className="text-sm text-muted-foreground">{lang.name}</div>
                </button>
              ))}
            </div>
            
            <Button 
              onClick={handleContinue} 
              className="w-full"
              data-testid="button-continue"
            >
              {t('button.continue')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
