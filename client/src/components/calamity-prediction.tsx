import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CloudRain, Sun, Bug, Shield, AlertCircle, Thermometer, Droplets, Info, RotateCcw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { supportedCrops } from '@shared/schema';
import { getLocalizedCropName } from '@/lib/utils';

interface CalamityPredictionProps {
  farmer: any;
}

export function CalamityPrediction({ farmer }: CalamityPredictionProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [prediction, setPrediction] = useState<any>(null);
  const [selectedCrop, setSelectedCrop] = useState('');
  const [cropError, setCropError] = useState('');

  const [weatherData, setWeatherData] = useState({
    temperature: 28,
    humidity: 65,
    rainfall: 450
  });

  const [soilData, setSoilData] = useState({
    N: 90,
    P: 42,
    K: 43,
    ph: 6.5
  });

  const [weatherErrors, setWeatherErrors] = useState<Record<string, string>>({});
  const [soilErrors, setSoilErrors] = useState<Record<string, string>>();

  const calamityMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/predict/calamity', {
        farmerId: farmer.id,
        weatherData: data.weatherData,
        soilData: data.soilData,
        crop: data.crop
      });
      return response.json();
    },
    onSuccess: (data) => {
      setPrediction(data.prediction);
      toast({
        title: "✅ Calamity risk assessment completed.",
        description: `${t('calamity.overallRisk')}: ${t(`risk.${data.prediction.overall_risk}`)}`,
      });
    },
    onError: () => {
      toast({
        title: "Assessment Error",
        description: "We couldn't complete the risk assessment. Please try again.",
        variant: 'destructive',
      });
    }
  });

  const handlePredict = () => {
    const wErrors: Record<string, string> = {};
    const sErrors: Record<string, string> = {};
    let hasError = false;

    // Weather validation
    if (weatherData.temperature === undefined || weatherData.temperature === null || isNaN(weatherData.temperature)) {
      wErrors.temperature = "Please enter Temperature."; hasError = true;
    } else if (weatherData.temperature < -10 || weatherData.temperature > 60) {
      wErrors.temperature = "Temperature must be between -10°C and 60°C."; hasError = true;
    }
    if (weatherData.humidity === undefined || isNaN(weatherData.humidity)) {
      wErrors.humidity = "Please enter Humidity."; hasError = true;
    } else if (weatherData.humidity < 0 || weatherData.humidity > 100) {
      wErrors.humidity = "Humidity must be between 0% and 100%."; hasError = true;
    }
    if (weatherData.rainfall === undefined || isNaN(weatherData.rainfall)) {
      wErrors.rainfall = "Please enter Rainfall."; hasError = true;
    } else if (weatherData.rainfall < 0) {
      wErrors.rainfall = "Rainfall cannot be negative."; hasError = true;
    }

    // Soil validation
    if (!soilData.N && soilData.N !== 0) {
      sErrors.N = "Please enter Nitrogen."; hasError = true;
    } else if (soilData.N < 0 || soilData.N > 300) {
      sErrors.N = "Nitrogen must be between 0-300 kg/ha."; hasError = true;
    }
    if (!soilData.P && soilData.P !== 0) {
      sErrors.P = "Please enter Phosphorus."; hasError = true;
    } else if (soilData.P < 0 || soilData.P > 300) {
      sErrors.P = "Phosphorus must be between 0-300 kg/ha."; hasError = true;
    }
    if (!soilData.K && soilData.K !== 0) {
      sErrors.K = "Please enter Potassium."; hasError = true;
    } else if (soilData.K < 0 || soilData.K > 300) {
      sErrors.K = "Potassium must be between 0-300 kg/ha."; hasError = true;
    }
    if (!soilData.ph && soilData.ph !== 0) {
      sErrors.ph = "Please enter pH level."; hasError = true;
    } else if (soilData.ph < 3.5 || soilData.ph > 9.9) {
      sErrors.ph = "pH must be between 3.5 and 9.9."; hasError = true;
    }

    setWeatherErrors(wErrors);
    setSoilErrors(sErrors);

    if (!selectedCrop) {
      setCropError("Please choose Crop.");
      hasError = true;
    }

    if (hasError) {
      toast({
        title: "Validation Error",
        description: "Please complete all required fields before predicting.",
        variant: 'destructive',
      });
      return;
    }

    calamityMutation.mutate({
      weatherData,
      soilData,
      crop: selectedCrop
    });
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'HIGH': return 'text-red-600 bg-red-50 border-red-200';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'LOW': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getCalamityIcon = (type: string) => {
    switch (type) {
      case 'DROUGHT': return <Sun className="w-5 h-5 text-orange-500" />;
      case 'FLOOD': return <CloudRain className="w-5 h-5 text-blue-500" />;
      case 'HEAT_STRESS': return <Sun className="w-5 h-5 text-red-500" />;
      case 'PEST_OUTBREAK': return <Bug className="w-5 h-5 text-green-500" />;
      case 'SOIL_EROSION': return <Shield className="w-5 h-5 text-brown-500" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {t('calamity.title')}
        </h2>
        <p className="text-muted-foreground">
          {t('calamity.description')}
        </p>
      </div>

      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="text-primary w-5 h-5" />
            <span>{t('calamity.conditions')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Weather Data */}
            <div className="space-y-3">
              <h4 className="font-medium">{t('calamity.weather')}</h4>
              <div className="space-y-2">
                <Label htmlFor="temperature">{t('crop.temperature')} (°C)</Label>
                <Input
                  id="temperature"
                  type="number"
                  value={weatherData.temperature}
                  onChange={(e) => {
                    setWeatherErrors(prev => ({ ...prev, temperature: '' }));
                    setWeatherData(prev => ({ ...prev, temperature: parseFloat(e.target.value) || 0 }));
                  }}
                  placeholder="28"
                  className={weatherErrors?.temperature ? 'border-destructive focus:ring-destructive' : ''}
                />
                {weatherErrors?.temperature && <p className="text-xs text-destructive">{weatherErrors.temperature}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="humidity">{t('crop.humidity')} (%)</Label>
                <Input
                  id="humidity"
                  type="number"
                  value={weatherData.humidity}
                  onChange={(e) => {
                    setWeatherErrors(prev => ({ ...prev, humidity: '' }));
                    setWeatherData(prev => ({ ...prev, humidity: parseFloat(e.target.value) || 0 }));
                  }}
                  placeholder="65"
                  className={weatherErrors?.humidity ? 'border-destructive focus:ring-destructive' : ''}
                />
                {weatherErrors?.humidity && <p className="text-xs text-destructive">{weatherErrors.humidity}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="rainfall">{t('crop.rainfall')} (mm)</Label>
                <Input
                  id="rainfall"
                  type="number"
                  value={weatherData.rainfall}
                  onChange={(e) => {
                    setWeatherErrors(prev => ({ ...prev, rainfall: '' }));
                    setWeatherData(prev => ({ ...prev, rainfall: parseFloat(e.target.value) || 0 }));
                  }}
                  placeholder="450"
                  className={weatherErrors?.rainfall ? 'border-destructive focus:ring-destructive' : ''}
                />
                {weatherErrors?.rainfall && <p className="text-xs text-destructive">{weatherErrors.rainfall}</p>}
              </div>
            </div>

            {/* Soil Data */}
            <div className="space-y-3">
              <h4 className="font-medium">{t('calamity.soil')}</h4>
              <div className="space-y-2">
                <Label htmlFor="nitrogen">{t('crop.nitrogen')}</Label>
                <Input
                  id="nitrogen"
                  type="number"
                  value={soilData.N}
                  onChange={(e) => {
                    setSoilErrors(prev => ({ ...prev, N: '' }));
                    setSoilData(prev => ({ ...prev, N: parseFloat(e.target.value) || 0 }));
                  }}
                  placeholder="90"
                  className={soilErrors?.N ? 'border-destructive focus:ring-destructive' : ''}
                />
                {soilErrors?.N && <p className="text-xs text-destructive">{soilErrors.N}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phosphorus">{t('crop.phosphorus')}</Label>
                <Input
                  id="phosphorus"
                  type="number"
                  value={soilData.P}
                  onChange={(e) => {
                    setSoilErrors(prev => ({ ...prev, P: '' }));
                    setSoilData(prev => ({ ...prev, P: parseFloat(e.target.value) || 0 }));
                  }}
                  placeholder="42"
                  className={soilErrors?.P ? 'border-destructive focus:ring-destructive' : ''}
                />
                {soilErrors?.P && <p className="text-xs text-destructive">{soilErrors.P}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="potassium">{t('crop.potassium')}</Label>
                <Input
                  id="potassium"
                  type="number"
                  value={soilData.K}
                  onChange={(e) => {
                    setSoilErrors(prev => ({ ...prev, K: '' }));
                    setSoilData(prev => ({ ...prev, K: parseFloat(e.target.value) || 0 }));
                  }}
                  placeholder="43"
                  className={soilErrors?.K ? 'border-destructive focus:ring-destructive' : ''}
                />
                {soilErrors?.K && <p className="text-xs text-destructive">{soilErrors.K}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="ph">{t('crop.ph')}</Label>
                <Input
                  id="ph"
                  type="number"
                  step="0.1"
                  value={soilData.ph}
                  onChange={(e) => {
                    setSoilErrors(prev => ({ ...prev, ph: '' }));
                    setSoilData(prev => ({ ...prev, ph: parseFloat(e.target.value) || 0 }));
                  }}
                  placeholder="6.5"
                  className={soilErrors?.ph ? 'border-destructive focus:ring-destructive' : ''}
                />
                {soilErrors?.ph && <p className="text-xs text-destructive">{soilErrors.ph}</p>}
              </div>
            </div>
          </div>

          {/* Crop Selection */}
          <div className="space-y-2">
            <Label htmlFor="crop">{t('calamity.selectCrop')}</Label>
            <Select 
              value={selectedCrop} 
              onValueChange={(val) => {
                setCropError('');
                setSelectedCrop(val);
              }}
            >
              <SelectTrigger className={cropError ? 'border-destructive focus:ring-destructive' : ''}>
                <SelectValue placeholder={t('calamity.chooseCrop')} />
              </SelectTrigger>
              <SelectContent>
                {supportedCrops.map((crop) => (
                  <SelectItem key={crop} value={crop}>
                    {t(getLocalizedCropName(crop, farmer.language))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {cropError && <p className="text-xs text-destructive mt-1">{cropError}</p>}
          </div>

          <Button 
            onClick={handlePredict} 
            disabled={calamityMutation.isPending}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            {calamityMutation.isPending ? "Analyzing Calamity Risk..." : t('calamity.predict')}
          </Button>
        </CardContent>
      </Card>

      {/* Loading State */}
      {calamityMutation.isPending && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 shadow-md animate-in fade-in duration-300">
          <CardContent className="p-8 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="relative flex items-center justify-center">
              <div className="w-14 h-14 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <AlertTriangle className="w-6 h-6 text-primary absolute animate-pulse" />
            </div>
            <div className="space-y-1 max-w-sm">
              <p className="text-foreground font-semibold text-sm">Evaluating Calamity Risks...</p>
              <p className="text-xs text-muted-foreground">Running flood, drought, heat stress & pest outbreak prediction algorithms...</p>
            </div>
            <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '80%' }} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State with Retry Button */}
      {calamityMutation.isError && !calamityMutation.isPending && (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm animate-in fade-in duration-300">
          <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start space-x-3 text-destructive">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-left">
                <h4 className="font-semibold text-sm">Risk assessment could not be completed</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {(calamityMutation.error as any)?.message || "A network or server error occurred while assessing calamity risks. Please try again."}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePredict}
              className="border-destructive/30 hover:bg-destructive/10 text-destructive shrink-0"
              data-testid="button-retry-calamity"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Retry Assessment
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Prediction Results */}
      {prediction && !calamityMutation.isPending && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="text-primary w-5 h-5" />
                <span>{t('calamity.assessment')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className={`p-6 rounded-xl border-2 flex flex-col md:flex-row items-center justify-between ${getRiskColor(prediction.overall_risk)} shadow-sm transition-all`}>
                <div className="flex items-center space-x-4 mb-4 md:mb-0">
                  <div className="p-3 bg-white/50 rounded-full backdrop-blur-sm">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold opacity-80 uppercase tracking-wider">{t('calamity.overallRisk')}</h3>
                    <div className="text-4xl font-extrabold tracking-tight mt-1">
                      {t(`risk.${prediction.overall_risk}`)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium opacity-80 mb-2">{t('calamity.riskScore')}</div>
                  <div className="flex items-center space-x-2">
                    <Progress value={(prediction.risk_score / 3) * 100} className="w-32 h-2 bg-white/40" />
                    <span className="font-bold text-lg">{prediction.risk_score}/3.0</span>
                  </div>
                </div>
              </div>

              {/* Specific Risk Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                {/* Flood Risk */}
                {(() => {
                  const details = (() => {
                    const found = prediction.calamities?.find((c: any) => c.type === 'FLOOD');
                    return found ? { hasRisk: true, severity: found.severity, prob: Math.round(found.probability * 100) } : { hasRisk: false, severity: 'LOW', prob: 10 };
                  })();
                  return (
                    <div className={`p-4 rounded-xl border-2 ${details.hasRisk ? 'bg-blue-50/50 border-blue-200 text-blue-950' : 'bg-card border-border'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm">Flood Risk</span>
                        <Badge variant={details.hasRisk ? 'destructive' : 'secondary'} className={details.hasRisk ? 'bg-blue-600' : ''}>
                          {details.severity}
                        </Badge>
                      </div>
                      <div className="flex items-end justify-between mt-4">
                        <span className="text-xs text-muted-foreground">Probability</span>
                        <span className="text-xl font-bold">{details.prob}%</span>
                      </div>
                      <Progress value={details.prob} className={`h-1.5 mt-2 ${details.hasRisk ? 'bg-blue-200' : 'bg-muted'}`} />
                    </div>
                  );
                })()}

                {/* Heat Risk */}
                {(() => {
                  const details = (() => {
                    const found = prediction.calamities?.find((c: any) => c.type === 'HEAT_STRESS');
                    return found ? { hasRisk: true, severity: found.severity, prob: Math.round(found.probability * 100) } : { hasRisk: false, severity: 'LOW', prob: 12 };
                  })();
                  return (
                    <div className={`p-4 rounded-xl border-2 ${details.hasRisk ? 'bg-orange-50/50 border-orange-200 text-orange-950' : 'bg-card border-border'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm">Heat Risk</span>
                        <Badge variant={details.hasRisk ? 'destructive' : 'secondary'} className={details.hasRisk ? 'bg-orange-600' : ''}>
                          {details.severity}
                        </Badge>
                      </div>
                      <div className="flex items-end justify-between mt-4">
                        <span className="text-xs text-muted-foreground">Probability</span>
                        <span className="text-xl font-bold">{details.prob}%</span>
                      </div>
                      <Progress value={details.prob} className={`h-1.5 mt-2 ${details.hasRisk ? 'bg-orange-200' : 'bg-muted'}`} />
                    </div>
                  );
                })()}

                {/* Drought Risk */}
                {(() => {
                  const details = (() => {
                    const found = prediction.calamities?.find((c: any) => c.type === 'DROUGHT');
                    return found ? { hasRisk: true, severity: found.severity, prob: Math.round(found.probability * 100) } : { hasRisk: false, severity: 'LOW', prob: 15 };
                  })();
                  return (
                    <div className={`p-4 rounded-xl border-2 ${details.hasRisk ? 'bg-amber-50/50 border-amber-200 text-amber-950' : 'bg-card border-border'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm">Drought Risk</span>
                        <Badge variant={details.hasRisk ? 'destructive' : 'secondary'} className={details.hasRisk ? 'bg-amber-600' : ''}>
                          {details.severity}
                        </Badge>
                      </div>
                      <div className="flex items-end justify-between mt-4">
                        <span className="text-xs text-muted-foreground">Probability</span>
                        <span className="text-xl font-bold">{details.prob}%</span>
                      </div>
                      <Progress value={details.prob} className={`h-1.5 mt-2 ${details.hasRisk ? 'bg-amber-200' : 'bg-muted'}`} />
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Preventive Measures */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="text-emerald-600 w-5 h-5" />
                <span>Preventive Measures & Advisory</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {prediction.preventive_measures && prediction.preventive_measures.length > 0 ? (
                <ul className="space-y-2">
                  {prediction.preventive_measures.map((measure: string, idx: number) => (
                    <li key={idx} className="flex items-start space-x-2 text-sm text-foreground bg-muted/30 p-2.5 rounded-lg border border-border/50">
                      <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full mt-2 shrink-0" />
                      <span>{measure}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No critical preventive measures required for low-risk environments.</p>
              )}

              {/* Specific Recommendations if calamities exist */}
              {prediction.calamities && prediction.calamities.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-bold text-sm mb-3">Action Plan for Detected Risks:</h4>
                  <div className="space-y-3">
                    {prediction.calamities.map((c: any, idx: number) => (
                      <div key={idx} className="p-3 bg-destructive/5 border border-destructive/10 rounded-lg">
                        <div className="flex items-center space-x-2 font-semibold text-sm text-destructive">
                          {getCalamityIcon(c.type)}
                          <span className="capitalize">{c.type.toLowerCase().replace('_', ' ')} Management</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 mb-2">{c.description}</p>
                        <ul className="list-disc list-inside text-xs space-y-1 text-foreground">
                          {c.recommendations?.map((rec: string, rIdx: number) => (
                            <li key={rIdx}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Weather Conditions */}
          <Card>
            <CardHeader>
              <CardTitle>{t('calamity.currentWeather')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center p-4 bg-gradient-to-br from-orange-50 to-red-50 border border-orange-100 rounded-xl">
                  <div className="p-3 bg-orange-100 text-orange-600 rounded-full mr-4">
                    <Thermometer className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs text-orange-600 font-medium">{t('crop.temperature')}</div>
                    <div className="text-2xl font-bold text-orange-950">{prediction.weather_conditions?.temperature || weatherData.temperature}°C</div>
                  </div>
                </div>
                <div className="flex items-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-full mr-4">
                    <Droplets className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs text-blue-600 font-medium">{t('crop.humidity')}</div>
                    <div className="text-2xl font-bold text-blue-950">{prediction.weather_conditions?.humidity || weatherData.humidity}%</div>
                  </div>
                </div>
                <div className="flex items-center p-4 bg-gradient-to-br from-sky-50 to-cyan-50 border border-sky-100 rounded-xl">
                  <div className="p-3 bg-sky-100 text-sky-600 rounded-full mr-4">
                    <CloudRain className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs text-sky-600 font-medium">{t('crop.rainfall')}</div>
                    <div className="text-2xl font-bold text-sky-950">{prediction.weather_conditions?.rainfall || weatherData.rainfall} mm</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
