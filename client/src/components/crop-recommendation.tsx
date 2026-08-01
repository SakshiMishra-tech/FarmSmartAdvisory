import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Sparkles, Target, Volume2, Droplets, Beaker, Bug, Lightbulb, Cloud, Wheat } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useVoice } from '@/hooks/use-voice';
import { useLocation } from '@/hooks/use-location';
import { formatUnit, formatNumber, getLocalizedStateName, getLocalizedDistrictName, getLocalizedCropName } from '@/lib/utils';

interface CropRecommendationProps {
  farmer: any;
}

export function CropRecommendation({ farmer }: CropRecommendationProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { speak } = useVoice();
  const { location, getCurrentLocation } = useLocation();
  
  const [soilData, setSoilData] = useState({
    N: '',
    P: '',
    K: '',
    ph: '',
    temperature: '',
    humidity: '',
    rainfall: ''
  });
  
  const [hasSHC, setHasSHC] = useState(false);
  const [prediction, setPrediction] = useState<any>(null);

  const localizeCrop = (crop: string) => t(getLocalizedCropName(crop, farmer.language));
  const getAdvisoryText = (tip: any) => {
    const crop = prediction?.predicted_crop ? localizeCrop(prediction.predicted_crop) : '';
    if (tip.type === 'irrigation') {
      return soilData.rainfall && parseFloat(soilData.rainfall) < 200
        ? t('advisory.irrigation.lowRain', { crop })
        : t('advisory.irrigation.okRain');
    }
    if (tip.type === 'fertilizer') {
      return soilData.N && parseFloat(soilData.N) < 50
        ? t('advisory.fertilizer.lowN')
        : t('advisory.fertilizer.ok');
    }
    return t('advisory.pest.default');
  };

  // Fetch soil data for district
  const { data: districtSoilData } = useQuery({
    queryKey: ['/api/soil', farmer.district.toLowerCase()],
    enabled: !hasSHC && !!farmer.district
  });

  // Fetch weather data
  const { data: weatherData, refetch: refetchWeather } = useQuery({
    queryKey: ['/api/weather'],
    queryFn: async () => {
      if (!location) {
        getCurrentLocation();
        return null;
      }
      const response = await apiRequest('GET', `/api/weather?lat=${location.latitude}&lon=${location.longitude}`);
      return response.json();
    },
    enabled: !!location
  });

  // Auto-fill soil data from district
  useEffect(() => {
    if (!hasSHC && districtSoilData?.success) {
      const data = districtSoilData.soilData;
      setSoilData(prev => ({
        ...prev,
        N: data.N?.toString() || '',
        P: data.P?.toString() || '',
        K: data.K?.toString() || '',
        ph: data.ph?.toString() || ''
      }));
    } else if (hasSHC) {
      // Clear auto-filled values when user selects "Yes" for soil health card
      setSoilData(prev => ({
        ...prev,
        N: '',
        P: '',
        K: '',
        ph: ''
      }));
    }
  }, [districtSoilData, hasSHC]);

  // Auto-fill weather data
  useEffect(() => {
    if (weatherData?.success) {
      const data = weatherData.weatherData;
      setSoilData(prev => ({
        ...prev,
        temperature: data.temperature?.toString() || '',
        humidity: data.humidity?.toString() || '',
        rainfall: data.rainfall?.toString() || ''
      }));
    }
  }, [weatherData]);

  const predictionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/predict/crop', data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setPrediction(data.prediction);
        toast({
          title: t('toast.predictionSuccess'),
          description: `${t('crop.predict')}: ${localizeCrop(data.prediction.predicted_crop)}`,
        });
      } else {
        throw new Error(data.error || 'Prediction failed');
      }
    },
    onError: (error) => {
      toast({
        title: t('toast.predictionFailed'),
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const numericSoilData = {
      N: parseFloat(soilData.N),
      P: parseFloat(soilData.P),
      K: parseFloat(soilData.K),
      ph: parseFloat(soilData.ph),
      temperature: parseFloat(soilData.temperature),
      humidity: parseFloat(soilData.humidity),
      rainfall: parseFloat(soilData.rainfall)
    };

    predictionMutation.mutate({
      farmerId: farmer.id,
      soilData: numericSoilData
    });
  };

  const handleSpeakResult = () => {
    if (prediction) {
      const text = `${t('crop.results')}: ${localizeCrop(prediction.predicted_crop)}, ${t('crop.confidence')} ${prediction.confidence_percentage.toFixed(1)}%.`;
      speak(text, farmer.language === 'hi' ? 'hi-IN' : 'en-US');
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-4 lg:gap-8">
      {/* Soil Data Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="text-primary w-5 h-5 flex-shrink-0" />
            <span data-testid="soil-data-title">{t('crop.soilData')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Soil Health Card Section */}
            <div className="p-4 bg-accent/10 rounded-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0 mb-3">
                <span className="text-sm font-medium" data-testid="shc-question">
                  {t('crop.shcQuestion')}
                </span>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={hasSHC ? "default" : "outline"}
                    onClick={() => setHasSHC(true)}
                    data-testid="button-shc-yes"
                  >
                    {t('button.yes')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={!hasSHC ? "default" : "outline"}
                    onClick={() => setHasSHC(false)}
                    data-testid="button-shc-no"
                  >
                    {t('button.no')}
                  </Button>
                </div>
              </div>
              
              {hasSHC ? (
                <div className="space-y-4">
                  {/* Main Instructions Card */}
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg shadow-sm">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-sm">📋</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-green-800 mb-3" data-testid="shc-instructions-title">
                          {t('crop.shcInstructionsTitle')}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-green-700" data-testid="shc-instructions">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                              <span>{t('crop.shcInstructionsN')}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                              <span>{t('crop.shcInstructionsP')}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                              <span>{t('crop.shcInstructionsK')}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                              <span>{t('crop.shcInstructionsPh')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 p-2 bg-green-100 rounded-md">
                          <p className="text-xs text-green-600">
                            {t('crop.shcTip')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Conversion Guide Card */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg shadow-sm">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-sm">🔄</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-blue-800 mb-3" data-testid="shc-conversion-title">
                          {t('crop.conversionTitle')}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-blue-700" data-testid="shc-conversion">
                          <div className="space-y-2">
                            <div className="p-2 bg-blue-100 rounded border-l-4 border-blue-300">
                              <p>{t('crop.ppm')}</p>
                            </div>
                            <div className="p-2 bg-blue-100 rounded border-l-4 border-blue-300">
                              <p>{t('crop.mgkg')}</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="p-2 bg-blue-100 rounded border-l-4 border-blue-300">
                              <p>{t('crop.missingPh')}</p>
                            </div>
                            <div className="p-2 bg-blue-100 rounded border-l-4 border-blue-300">
                              <p>{t('crop.phRange')}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Reference Card */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <span className="text-amber-600">⚡</span>
                      <p className="text-xs text-amber-700">
                        {t('crop.quickReference')}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-xs text-gray-600" data-testid="shc-help">
                    {t('crop.shcHelp')}
                  </p>
                </div>
              )}
            </div>

            {/* NPK Values */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nitrogen" className="flex items-center space-x-2">
                  <span className="font-medium">{t('crop.nitrogen')}</span>
                  {hasSHC && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      {t('crop.fromShc')}
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="nitrogen"
                    type="number"
                    placeholder={hasSHC ? "e.g., 45" : "0-140"}
                    min="0"
                    max="140"
                    value={soilData.N}
                    onChange={(e) => setSoilData(prev => ({ ...prev, N: e.target.value }))}
                    className={`text-center text-lg font-medium ${
                      hasSHC 
                        ? 'border-green-300 focus:border-green-500 bg-green-50 focus:bg-green-100' 
                        : 'border-gray-300 focus:border-blue-500'
                    } transition-colors`}
                    data-testid="input-nitrogen"
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{formatUnit('kg/ha', farmer.language)}</span>
                  {hasSHC && (
                    <span className="text-green-600 font-medium">{t('crop.readyFromCard')}</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phosphorus" className="flex items-center space-x-2">
                  <span className="font-medium">{t('crop.phosphorus')}</span>
                  {hasSHC && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      {t('crop.fromShc')}
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="phosphorus"
                    type="number"
                    placeholder={hasSHC ? "e.g., 23" : "5-145"}
                    min="5"
                    max="145"
                    value={soilData.P}
                    onChange={(e) => setSoilData(prev => ({ ...prev, P: e.target.value }))}
                    className={`text-center text-lg font-medium ${
                      hasSHC 
                        ? 'border-green-300 focus:border-green-500 bg-green-50 focus:bg-green-100' 
                        : 'border-gray-300 focus:border-blue-500'
                    } transition-colors`}
                    data-testid="input-phosphorus"
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{formatUnit('kg/ha', farmer.language)}</span>
                  {hasSHC && (
                    <span className="text-green-600 font-medium">{t('crop.readyFromCard')}</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="potassium" className="flex items-center space-x-2">
                  <span className="font-medium">{t('crop.potassium')}</span>
                  {hasSHC && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      {t('crop.fromShc')}
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="potassium"
                    type="number"
                    placeholder={hasSHC ? "e.g., 67" : "5-205"}
                    min="5"
                    max="205"
                    value={soilData.K}
                    onChange={(e) => setSoilData(prev => ({ ...prev, K: e.target.value }))}
                    className={`text-center text-lg font-medium ${
                      hasSHC 
                        ? 'border-green-300 focus:border-green-500 bg-green-50 focus:bg-green-100' 
                        : 'border-gray-300 focus:border-blue-500'
                    } transition-colors`}
                    data-testid="input-potassium"
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{formatUnit('kg/ha', farmer.language)}</span>
                  {hasSHC && (
                    <span className="text-green-600 font-medium">{t('crop.readyFromCard')}</span>
                  )}
                </div>
              </div>
            </div>

            {/* pH */}
            <div className="space-y-2">
              <Label htmlFor="ph" className="flex items-center space-x-2">
                <span className="font-medium">{t('crop.ph')}</span>
                {hasSHC && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    {t('crop.fromShc')}
                  </span>
                )}
              </Label>
              <div className="relative">
                <Input
                  id="ph"
                  type="number"
                  placeholder={hasSHC ? "e.g., 6.5" : "3.5-9.9"}
                  min="3.5"
                  max="9.9"
                  step="0.1"
                  value={soilData.ph}
                  onChange={(e) => setSoilData(prev => ({ ...prev, ph: e.target.value }))}
                  className={`text-center text-lg font-medium ${
                    hasSHC 
                      ? 'border-green-300 focus:border-green-500 bg-green-50 focus:bg-green-100' 
                      : 'border-gray-300 focus:border-blue-500'
                  } transition-colors`}
                  data-testid="input-ph"
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">pH</span>
                {hasSHC && (
                  <span className="text-green-600 font-medium">{t('crop.readyFromCard')}</span>
                )}
              </div>
            </div>

            {/* Weather Data */}
            <div className="p-4 bg-muted/50 rounded-md">
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 mb-3">
                <div className="flex items-center space-x-2">
                  <Cloud className="text-primary w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium" data-testid="weather-title">
                    {t('crop.weatherData')}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => refetchWeather()}
                  className="text-xs self-start sm:self-center"
                  data-testid="button-refresh-weather"
                >
                  {t('button.refresh')}
                </Button>
              </div>
              
              {hasSHC && (
                <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                  {t('crop.weatherNote')}
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('crop.temperature')}</span>
                  <div className="font-medium" data-testid="weather-temperature">
                    {formatNumber(soilData.temperature, farmer.language)}{formatUnit('°C', farmer.language)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('crop.humidity')}</span>
                  <div className="font-medium" data-testid="weather-humidity">
                    {formatNumber(soilData.humidity, farmer.language)}{formatUnit('%', farmer.language)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('crop.rainfall')}</span>
                  <div className="font-medium" data-testid="weather-rainfall">
                    {formatNumber(soilData.rainfall, farmer.language)}{formatUnit('mm', farmer.language)}
                  </div>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 p-3 bg-muted/50 rounded-md">
              <div className="flex items-center space-x-2">
                <MapPin className="text-primary w-4 h-4 flex-shrink-0" />
                                  <span className="text-sm" data-testid="location-display">
                    {t(getLocalizedDistrictName(farmer.district, farmer.language))}, {t(getLocalizedStateName(farmer.state, farmer.language))}
                  </span>
              </div>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={getCurrentLocation}
                className="text-xs self-start sm:self-center"
                data-testid="button-detect-location"
              >
                {t('button.autoDetect')}
              </Button>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={predictionMutation.isPending}
              data-testid="button-predict-crop"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {predictionMutation.isPending ? t('loading.analyzingShort') : t('crop.predict')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Prediction Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="text-primary w-5 h-5 flex-shrink-0" />
            <span data-testid="results-title">{t('crop.results')}</span>
            {prediction && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSpeakResult}
                className="ml-auto"
                data-testid="button-speak-result"
              >
                <Volume2 className="w-4 h-4" />
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {prediction ? (
            <>
              {/* Main Recommendation */}
              <div className="text-center mb-6">
                <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
                  <Wheat className="text-primary-foreground w-10 h-10 sm:w-12 sm:h-12" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-primary mb-2" data-testid="predicted-crop">
                  {localizeCrop(prediction.predicted_crop)}
                </h3>
                <div className="flex flex-col sm:flex-row sm:items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 mb-2">
                  <span className="text-sm text-muted-foreground">{t('crop.confidence')}:</span>
                  <span className="font-semibold text-lg" data-testid="confidence-percentage">
                    {prediction.confidence_percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${prediction.confidence_percentage}%` }}
                    data-testid="confidence-bar"
                  />
                </div>
              </div>

              {/* Alternative Crops */}
              {prediction.top_3_alternatives && prediction.top_3_alternatives.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium mb-3" data-testid="alternatives-title">
                    {t('crop.alternatives')}
                  </h4>
                  <div className="space-y-2">
                    {prediction.top_3_alternatives.slice(1).map((alt: any, index: number) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                        data-testid={`alternative-${index}`}
                      >
                        <span className="text-sm">{localizeCrop(alt.crop)}</span>
                        <span className="text-sm font-medium">
                          {alt.confidence_percentage.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Advisory Tips */}
              {prediction.advisory && prediction.advisory.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center space-x-2">
                    <Lightbulb className="w-4 h-4 text-primary" />
                    <span data-testid="advisory-title">{t('crop.advisory')}</span>
                  </h4>
                  
                  {prediction.advisory.map((tip: any, index: number) => (
                    <div 
                      key={index}
                      className={`p-3 bg-accent/10 rounded-md border-l-4 ${
                        tip.type === 'irrigation' ? 'border-primary' :
                        tip.type === 'fertilizer' ? 'border-accent' : 'border-orange-500'
                      }`}
                      data-testid={`advisory-${tip.type}`}
                    >
                      <div className="flex items-start space-x-2">
                        {tip.type === 'irrigation' && <Droplets className="w-4 h-4 text-primary mt-0.5" />}
                        {tip.type === 'fertilizer' && <Beaker className="w-4 h-4 text-accent mt-0.5" />}
                        {tip.type === 'pest' && <Bug className="w-4 h-4 text-orange-500 mt-0.5" />}
                        <div>
                          <h5 className="font-medium text-sm">{t(`advisory.${tip.type}`)}</h5>
                          <p className="text-xs text-muted-foreground">{getAdvisoryText(tip)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground" data-testid="no-prediction">
              <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('crop.noPrediction')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
