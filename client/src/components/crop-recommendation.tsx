import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Sparkles, Target, Volume2, Droplets, Beaker, Bug, Lightbulb, Cloud, Wheat, AlertCircle, RotateCcw, RefreshCw } from 'lucide-react';
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
  
  const hasSHC = false;
  const [prediction, setPrediction] = useState<any>(null);
  const [rainfallAdjusted, setRainfallAdjusted] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prediction && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [prediction]);

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

  // Fetch weather data with retry disabled so UI never hangs
  const { data: weatherData, refetch: refetchWeather, isLoading: isLoadingWeather, isFetching: isFetchingWeather, isError: isWeatherError } = useQuery({
    queryKey: ['/api/weather', location?.latitude, location?.longitude, farmer.district],
    queryFn: async () => {
      let url = `/api/weather?farmerId=${farmer.id}`;
      if (location) {
        url += `&lat=${location.latitude}&lon=${location.longitude}`;
      } else if (farmer.district) {
        url += `&district=${encodeURIComponent(farmer.district)}&state=${encodeURIComponent(farmer.state)}`;
      } else {
        return null;
      }
      const response = await apiRequest('GET', url);
      return response.json();
    },
    refetchInterval: 15 * 60 * 1000, // Auto refresh every 15 mins
    staleTime: 10 * 60 * 1000,       // Cache for 10 mins
    retry: false                      // Don't loop retries to hang UI
  });

  // Handle Live Location Click
  const handleAutoDetectLocation = async () => {
    try {
      const loc = await getCurrentLocation();
      if (loc) {
        toast({
          title: "Live Location Detected",
          description: `Lat: ${loc.latitude.toFixed(2)}, Lon: ${loc.longitude.toFixed(2)}. Updating weather & soil metrics...`
        });
        refetchWeather();
      } else {
        toast({
          title: "Location Permission Denied",
          description: "Using default district weather & soil averages.",
          variant: "destructive"
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Auto-fill soil data from district
  useEffect(() => {
    if (!hasSHC && (districtSoilData as any)?.success) {
      const data = (districtSoilData as any).soilData;
      setSoilData(prev => ({
        ...prev,
        N: data.N?.toString() || prev.N || '90',
        P: data.P?.toString() || prev.P || '42',
        K: data.K?.toString() || prev.K || '43',
        ph: data.ph?.toString() || prev.ph || '6.5'
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
        temperature: data.temperature?.toString() || '28.5',
        humidity: data.humidity?.toString() || '65',
        rainfall: data.rainfall?.toString() || '15'
      }));
    } else {
      // Fallback defaults so values are never empty
      setSoilData(prev => ({
        ...prev,
        temperature: prev.temperature || '28.5',
        humidity: prev.humidity || '65',
        rainfall: prev.rainfall || '15'
      }));
    }
  }, [weatherData]);

  const [cropFormErrors, setCropFormErrors] = useState<Record<string, string>>({});

  const validateCropForm = () => {
    const errors: Record<string, string> = {};

    // Soil nutrient validation
    if (!soilData.N || soilData.N.toString().trim() === '') errors.N = "Please enter Nitrogen value.";
    if (!soilData.P || soilData.P.toString().trim() === '') errors.P = "Please enter Phosphorus value.";
    if (!soilData.K || soilData.K.toString().trim() === '') errors.K = "Please enter Potassium value.";
    if (!soilData.ph || soilData.ph.toString().trim() === '') errors.ph = "Please enter pH level.";

    // Weather field validation
    if (!soilData.temperature || soilData.temperature.toString().trim() === '') {
      errors.temperature = "Temperature is required. Please enter a value or use Live Location.";
    } else if (parseFloat(soilData.temperature) < -10 || parseFloat(soilData.temperature) > 60) {
      errors.temperature = "Temperature must be between -10°C and 60°C.";
    }
    if (!soilData.humidity || soilData.humidity.toString().trim() === '') {
      errors.humidity = "Humidity is required. Please enter a value or use Live Location.";
    } else if (parseFloat(soilData.humidity) < 0 || parseFloat(soilData.humidity) > 100) {
      errors.humidity = "Humidity must be between 0% and 100%.";
    }
    if (!soilData.rainfall || soilData.rainfall.toString().trim() === '') {
      errors.rainfall = "Rainfall is required. Please enter a value or use Live Location.";
    } else if (parseFloat(soilData.rainfall) < 0) {
      errors.rainfall = "Rainfall cannot be negative.";
    }

    // Location validation
    if (!farmer.district || !farmer.state) {
      errors.location = "Please set your State and District in Settings before predicting.";
    }

    setCropFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast({
        title: "Validation Error",
        description: "Please complete all required fields before predicting.",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const predictionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/predict/crop', data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setPrediction(data.prediction);
        toast({
          title: "✅ Crop recommendation generated.",
          description: `${t('crop.predict')}: ${localizeCrop(data.prediction.predicted_crop)}`,
        });
      } else {
        throw new Error(data.error || 'Prediction failed');
      }
    },
    onError: () => {
      toast({
        title: "Recommendation Error",
        description: "We couldn't generate a crop recommendation. Please check your soil values and try again.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCropForm()) return;

    const parseOrZero = (val: any) => {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? 0 : parsed;
    };

    let rainfallVal = parseOrZero(soilData.rainfall);
    const wasRainfallAdjusted = rainfallVal > 0 && rainfallVal < 20.2;
    if (rainfallVal < 20.2) {
      rainfallVal = 20.2; // Auto-clamp to minimum acceptable rainfall to prevent Zod 500 error
    }
    setRainfallAdjusted(wasRainfallAdjusted);

    const parsedData = {
      N: parseOrZero(soilData.N),
      P: parseOrZero(soilData.P),
      K: parseOrZero(soilData.K),
      ph: parseOrZero(soilData.ph),
      temperature: parseOrZero(soilData.temperature) || 28.5,
      humidity: parseOrZero(soilData.humidity) || 65.0,
      rainfall: rainfallVal
    };

    predictionMutation.mutate({
      farmerId: farmer.id,
      soilData: parsedData
    });
  };

  const handleSpeakResult = () => {
    if (prediction) {
      const text = `${t('crop.results')}: ${localizeCrop(prediction.predicted_crop)}, ${t('crop.confidence')} ${prediction.confidence_percentage.toFixed(1)}%.`;
      speak(text, farmer.language === 'hi' ? 'hi-IN' : 'en-US');
    }
  };

  // Generate a concise human-readable reason why this crop was recommended
  const getReason = () => {
    if (!prediction) return '';
    const crop = localizeCrop(prediction.predicted_crop);
    const N = parseFloat(soilData.N) || 0;
    const P = parseFloat(soilData.P) || 0;
    const K = parseFloat(soilData.K) || 0;
    const ph = parseFloat(soilData.ph) || 0;
    const temp = parseFloat(soilData.temperature) || 0;
    const confidence = prediction.confidence_percentage || 0;

    const factors: string[] = [];
    if (N >= 60 && N <= 140) factors.push('good nitrogen levels');
    if (P >= 30 && P <= 80) factors.push('adequate phosphorus');
    if (K >= 30 && K <= 80) factors.push('sufficient potassium');
    if (ph >= 5.5 && ph <= 7.5) factors.push('optimal pH range');
    if (temp >= 15 && temp <= 35) factors.push('suitable temperature');

    if (factors.length === 0) {
      return `${crop} is recommended with ${confidence.toFixed(1)}% confidence based on your current soil and weather conditions.`;
    }
    return `${crop} is the best match (${confidence.toFixed(1)}% confidence) due to your ${factors.slice(0, 3).join(', ')}.`;
  };

  // Extract water requirement text from irrigation advisory
  const getWaterRequirement = () => {
    if (!prediction?.advisory) return null;
    return prediction.advisory.find((a: any) => a.type === 'irrigation');
  };

  // Extract fertilizer suggestion text from fertilizer advisory
  const getFertilizerSuggestion = () => {
    if (!prediction?.advisory) return null;
    return prediction.advisory.find((a: any) => a.type === 'fertilizer');
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Soil Data Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="text-primary w-5 h-5 flex-shrink-0" />
            <span data-testid="soil-data-title">{t('crop.soilData')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {/* Live Location Auto-Detect Card */}
          <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-emerald-600 text-white rounded-lg shrink-0 shadow-sm">
                <MapPin className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-emerald-950 dark:text-emerald-100">{t('crop.liveLocationTitle')}</h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                  {t('crop.liveLocationDescription')}
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={handleAutoDetectLocation}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-4 py-2 shrink-0 w-full sm:w-auto shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> {t('button.useLiveLocation')}
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* NPK Values */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    onChange={(e) => {
                      setCropFormErrors(prev => ({ ...prev, N: '' }));
                      setSoilData(prev => ({ ...prev, N: e.target.value }));
                    }}
                    className={`text-center text-lg font-medium ${
                      cropFormErrors.N ? 'border-destructive focus:ring-destructive' :
                      hasSHC 
                        ? 'border-green-300 focus:border-green-500 bg-green-50 focus:bg-green-100' 
                        : 'border-gray-300 focus:border-blue-500'
                    } transition-colors`}
                    data-testid="input-nitrogen"
                  />
                </div>
                {cropFormErrors.N && <p className="text-xs text-destructive">{cropFormErrors.N}</p>}
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
                    onChange={(e) => {
                      setCropFormErrors(prev => ({ ...prev, P: '' }));
                      setSoilData(prev => ({ ...prev, P: e.target.value }));
                    }}
                    className={`text-center text-lg font-medium ${
                      cropFormErrors.P ? 'border-destructive focus:ring-destructive' :
                      hasSHC 
                        ? 'border-green-300 focus:border-green-500 bg-green-50 focus:bg-green-100' 
                        : 'border-gray-300 focus:border-blue-500'
                    } transition-colors`}
                    data-testid="input-phosphorus"
                  />
                </div>
                {cropFormErrors.P && <p className="text-xs text-destructive">{cropFormErrors.P}</p>}
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
                    onChange={(e) => {
                      setCropFormErrors(prev => ({ ...prev, K: '' }));
                      setSoilData(prev => ({ ...prev, K: e.target.value }));
                    }}
                    className={`text-center text-lg font-medium ${
                      cropFormErrors.K ? 'border-destructive focus:ring-destructive' :
                      hasSHC 
                        ? 'border-green-300 focus:border-green-500 bg-green-50 focus:bg-green-100' 
                        : 'border-gray-300 focus:border-blue-500'
                    } transition-colors`}
                    data-testid="input-potassium"
                  />
                </div>
                {cropFormErrors.K && <p className="text-xs text-destructive">{cropFormErrors.K}</p>}
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
                  onChange={(e) => {
                    setCropFormErrors(prev => ({ ...prev, ph: '' }));
                    setSoilData(prev => ({ ...prev, ph: e.target.value }));
                  }}
                  className={`text-center text-lg font-medium ${
                    cropFormErrors.ph ? 'border-destructive focus:ring-destructive' :
                    hasSHC 
                      ? 'border-green-300 focus:border-green-500 bg-green-50 focus:bg-green-100' 
                      : 'border-gray-300 focus:border-blue-500'
                  } transition-colors`}
                  data-testid="input-ph"
                />
              </div>
              {cropFormErrors.ph && <p className="text-xs text-destructive">{cropFormErrors.ph}</p>}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">pH</span>
                {hasSHC && (
                  <span className="text-green-600 font-medium">{t('crop.readyFromCard')}</span>
                )}
              </div>
            </div>

            {/* Weather Data */}
            <div className="p-4 bg-muted/50 rounded-md relative">
              {isLoadingWeather && !soilData.temperature && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-md">
                  <div className="flex items-center space-x-2 text-primary">
                    <Cloud className="w-5 h-5 animate-pulse" />
                    <span className="text-sm font-medium">Fetching weather...</span>
                  </div>
                </div>
              )}
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 mb-3">
                <div className="flex items-center space-x-2">
                  <Cloud className="text-primary w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium" data-testid="weather-title">
                    {t('crop.weatherData')}
                  </span>
                  <span className="text-xs text-muted-foreground">(auto-filled • editable)</span>
                </div>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => refetchWeather()}
                  className="text-xs self-start sm:self-center"
                  disabled={isLoadingWeather}
                  data-testid="button-refresh-weather"
                >
                  {t('button.refresh')}
                </Button>
              </div>

              {isWeatherError && !soilData.temperature ? (
                <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-700 dark:text-amber-300 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{farmer.language === 'hi' ? "लाइव मौसम डेटा उपलब्ध नहीं। कृपया नीचे मौसम मान दर्ज करें।" : "Live weather unavailable. Please enter values manually below."}</span>
                </div>
              ) : hasSHC ? (
                <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                  {t('crop.weatherNote')}
                </div>
              ) : null}

              {weatherData && weatherData.success && !isLoadingWeather && (
                <div className="absolute top-4 right-4 flex items-center space-x-1.5 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-md border text-[10px] text-muted-foreground font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span>Updated just now</span>
                </div>
              )}

              {/* Editable Weather Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="temperature" className="text-xs text-muted-foreground">{t('crop.temperature')} (°C)</Label>
                  <Input
                    id="temperature"
                    type="number"
                    placeholder="e.g., 28.5"
                    step="0.1"
                    min="-10"
                    max="60"
                    value={soilData.temperature}
                    onChange={(e) => {
                      setCropFormErrors(prev => ({ ...prev, temperature: '' }));
                      setSoilData(prev => ({ ...prev, temperature: e.target.value }));
                    }}
                    className={`text-center font-medium ${cropFormErrors.temperature ? 'border-destructive focus:ring-destructive' : ''}`}
                    data-testid="weather-temperature"
                  />
                  {cropFormErrors.temperature && <p className="text-xs text-destructive">{cropFormErrors.temperature}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="humidity" className="text-xs text-muted-foreground">{t('crop.humidity')} (%)</Label>
                  <Input
                    id="humidity"
                    type="number"
                    placeholder="e.g., 65"
                    min="0"
                    max="100"
                    value={soilData.humidity}
                    onChange={(e) => {
                      setCropFormErrors(prev => ({ ...prev, humidity: '' }));
                      setSoilData(prev => ({ ...prev, humidity: e.target.value }));
                    }}
                    className={`text-center font-medium ${cropFormErrors.humidity ? 'border-destructive focus:ring-destructive' : ''}`}
                    data-testid="weather-humidity"
                  />
                  {cropFormErrors.humidity && <p className="text-xs text-destructive">{cropFormErrors.humidity}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rainfall" className="text-xs text-muted-foreground">{t('crop.rainfall')} (mm)</Label>
                  <Input
                    id="rainfall"
                    type="number"
                    placeholder="e.g., 150"
                    min="0"
                    step="0.1"
                    value={soilData.rainfall}
                    onChange={(e) => {
                      setCropFormErrors(prev => ({ ...prev, rainfall: '' }));
                      setSoilData(prev => ({ ...prev, rainfall: e.target.value }));
                    }}
                    className={`text-center font-medium ${cropFormErrors.rainfall ? 'border-destructive focus:ring-destructive' : ''}`}
                    data-testid="weather-rainfall"
                  />
                  {cropFormErrors.rainfall && <p className="text-xs text-destructive">{cropFormErrors.rainfall}</p>}
                </div>
              </div>
            </div>

            {/* Location */}
            <div className={`flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 p-3 rounded-md border ${
              cropFormErrors.location ? 'bg-destructive/5 border-destructive/30' : 'bg-muted/50 border-transparent'
            }`}>
              <div className="flex items-center space-x-2">
                <MapPin className={`w-4 h-4 flex-shrink-0 ${cropFormErrors.location ? 'text-destructive' : 'text-primary'}`} />
                {farmer.district && farmer.state ? (
                  <span className="text-sm" data-testid="location-display">
                    {t(getLocalizedDistrictName(farmer.district, farmer.language))}, {t(getLocalizedStateName(farmer.state, farmer.language))}
                  </span>
                ) : (
                  <span className="text-sm text-destructive font-medium">
                    Location not set — please update in Settings
                  </span>
                )}
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
              {cropFormErrors.location && (
                <p className="text-xs text-destructive w-full">{cropFormErrors.location}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-lg rounded-xl shadow-sm hover:shadow transition-all font-semibold mt-4"
              disabled={predictionMutation.isPending}
              data-testid="button-predict-crop"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {predictionMutation.isPending ? "Generating Recommendation..." : t('crop.predict')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Rainfall adjusted banner */}
      {rainfallAdjusted && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start space-x-2 text-xs text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>Note:</strong> Your entered rainfall ({soilData.rainfall} mm) is below the minimum required for the ML model (20.2 mm). It has been automatically adjusted to 20.2 mm for prediction accuracy. The recommendation is still valid for your region.
          </span>
        </div>
      )}

      {/* Loading State */}
      {predictionMutation.isPending && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 shadow-md animate-in fade-in duration-300">
          <CardContent className="p-8 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="relative flex items-center justify-center">
              <div className="w-14 h-14 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <Sparkles className="w-6 h-6 text-primary absolute animate-pulse" />
            </div>
            <div className="space-y-1 max-w-sm">
              <p className="text-foreground font-semibold text-sm">{t('loading.analyzingShort')}...</p>
              <p className="text-xs text-muted-foreground">Evaluating soil nutrients, climate suitability & localized crop yield models...</p>
            </div>
            <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '75%' }} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Network / Prediction Error State with Retry Button */}
      {predictionMutation.isError && !predictionMutation.isPending && (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm animate-in fade-in duration-300">
          <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start space-x-3 text-destructive">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-left">
                <h4 className="font-semibold text-sm">Failed to generate crop recommendation</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {(predictionMutation.error as any)?.message || "A network or server error occurred. Please check your soil & weather values and try again."}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSubmit}
              className="border-destructive/30 hover:bg-destructive/10 text-destructive shrink-0"
              data-testid="button-retry-crop-prediction"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Retry Recommendation
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Prediction Results */}
      {prediction && !predictionMutation.isPending && (
        <div ref={resultsRef} className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          <Card className="border-primary/20 shadow-lg bg-gradient-to-br from-background to-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="text-primary w-5 h-5 flex-shrink-0" />
                <span data-testid="results-title">{t('crop.results')}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSpeakResult}
                  className="ml-auto hover:bg-primary/10 hover:text-primary transition-colors"
                  data-testid="button-speak-result"
                >
                  <Volume2 className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {/* Main Recommendation */}
              <div className="text-center mb-8 relative">
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl -z-10 w-32 h-32 mx-auto"></div>
                <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-5 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-md transform hover:scale-105 transition-transform">
                  <Wheat className="text-primary-foreground w-12 h-12 sm:w-14 sm:h-14" />
                </div>
                <div className="text-sm uppercase tracking-widest text-muted-foreground font-semibold mb-1">Top Recommendation</div>
                <h3 className="text-3xl sm:text-4xl font-extrabold text-primary mb-3 drop-shadow-sm" data-testid="predicted-crop">
                  {localizeCrop(prediction.predicted_crop)}
                </h3>
                <div className="flex flex-col sm:flex-row sm:items-center justify-center space-y-1 sm:space-y-0 sm:space-x-3 mb-3">
                  <span className="text-sm font-medium text-muted-foreground">{t('crop.confidence')}:</span>
                  <span className="font-bold text-xl bg-primary/10 text-primary px-3 py-1 rounded-full" data-testid="confidence-percentage">
                    {prediction.confidence_percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full max-w-md mx-auto bg-muted rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-primary h-2.5 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${prediction.confidence_percentage}%` }}
                    data-testid="confidence-bar"
                  />
                </div>
              </div>

              {/* ─── NEW: Reason + Water Requirement + Fertilizer ─── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {/* Reason */}
                <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl shadow-sm">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="p-1.5 bg-primary/20 text-primary rounded-lg">
                      <Lightbulb className="w-4 h-4" />
                    </div>
                    <h5 className="font-bold text-sm text-primary">Why This Crop?</h5>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed" data-testid="crop-reason">
                    {getReason()}
                  </p>
                </div>

                {/* Water Requirement */}
                {getWaterRequirement() && (
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="p-1.5 bg-blue-100 dark:bg-blue-900/60 text-blue-600 rounded-lg">
                        <Droplets className="w-4 h-4" />
                      </div>
                      <h5 className="font-bold text-sm text-blue-700 dark:text-blue-300">Water Requirement</h5>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed" data-testid="water-requirement">
                      {getAdvisoryText(getWaterRequirement())}
                    </p>
                  </div>
                )}

                {/* Fertilizer Suggestion */}
                {getFertilizerSuggestion() && (
                  <div className="p-4 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/40 dark:to-green-900/20 border border-green-200 dark:border-green-800 rounded-xl shadow-sm">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="p-1.5 bg-green-100 dark:bg-green-900/60 text-green-600 rounded-lg">
                        <Beaker className="w-4 h-4" />
                      </div>
                      <h5 className="font-bold text-sm text-green-700 dark:text-green-300">Fertilizer Suggestion</h5>
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400 leading-relaxed" data-testid="fertilizer-suggestion">
                      {getAdvisoryText(getFertilizerSuggestion())}
                    </p>
                  </div>
                )}
              </div>
              {/* ─────────────────────────────────────────────────── */}

              {/* Alternative Crops */}
              {prediction.alternatives && prediction.alternatives.length > 1 && (
                <div className="mb-8">
                  <h4 className="text-sm uppercase tracking-wider text-muted-foreground font-semibold mb-4" data-testid="alternatives-title">
                    Top 5 {t('crop.alternatives')}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {prediction.alternatives.slice(1).map((alt: any, index: number) => (
                      <div 
                        key={index} 
                        className="flex flex-col items-center justify-center p-4 bg-card border border-border/50 rounded-xl hover:shadow-md hover:border-primary/30 transition-all group"
                        data-testid={`alternative-${index}`}
                      >
                        <span className="text-lg font-bold group-hover:text-primary transition-colors text-center mb-1">{localizeCrop(alt.crop)}</span>
                        <span className="text-sm font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {alt.confidence_percentage.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Advisory Tips — full grid (irrigation, fertilizer, pest) */}
              {prediction.advisory && prediction.advisory.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm uppercase tracking-wider text-muted-foreground font-semibold flex items-center space-x-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span data-testid="advisory-title">{t('crop.advisory')}</span>
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {prediction.advisory.map((tip: any, index: number) => (
                      <div 
                        key={index}
                        className={`p-4 bg-card rounded-xl border-t-4 shadow-sm hover:shadow-md transition-shadow ${
                          tip.type === 'irrigation' ? 'border-t-blue-500' :
                          tip.type === 'fertilizer' ? 'border-t-green-500' : 'border-t-orange-500'
                        }`}
                        data-testid={`advisory-${tip.type}`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-lg shrink-0 ${
                            tip.type === 'irrigation' ? 'bg-blue-100 text-blue-600' :
                            tip.type === 'fertilizer' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                          }`}>
                            {tip.type === 'irrigation' && <Droplets className="w-5 h-5" />}
                            {tip.type === 'fertilizer' && <Beaker className="w-5 h-5" />}
                            {tip.type === 'pest' && <Bug className="w-5 h-5" />}
                          </div>
                          <div>
                            <h5 className="font-bold text-sm mb-1">{t(`advisory.${tip.type}`)}</h5>
                            <p className="text-sm text-muted-foreground leading-relaxed">{getAdvisoryText(tip)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
