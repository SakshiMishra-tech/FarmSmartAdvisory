import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CloudRain, Sun, Bug, Shield, AlertCircle, Thermometer, Droplets, Info, ArrowRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { supportedCrops } from '@shared/schema.ts';
import { formatNumber, getLocalizedCropName } from '@/lib/utils';

interface CalamityPredictionProps {
  farmer: any;
}

export function CalamityPrediction({ farmer }: CalamityPredictionProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [prediction, setPrediction] = useState<any>(null);
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
  const [selectedCrop, setSelectedCrop] = useState('');

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
        title: t('calamity.complete'),
        description: `${t('calamity.overallRisk')}: ${t(`risk.${data.prediction.overall_risk}`)}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: t('toast.predictionFailed'),
        description: error.message || t('calamity.failed'),
        variant: 'destructive',
      });
    }
  });

  const handlePredict = () => {
    if (!selectedCrop) {
      toast({
        title: t('calamity.selectCropTitle'),
        description: t('calamity.selectCropDesc'),
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
                  onChange={(e) => setWeatherData(prev => ({
                    ...prev,
                    temperature: parseFloat(e.target.value) || 0
                  }))}
                  placeholder="28"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="humidity">{t('crop.humidity')} (%)</Label>
                <Input
                  id="humidity"
                  type="number"
                  value={weatherData.humidity}
                  onChange={(e) => setWeatherData(prev => ({
                    ...prev,
                    humidity: parseFloat(e.target.value) || 0
                  }))}
                  placeholder="65"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rainfall">{t('crop.rainfall')} (mm)</Label>
                <Input
                  id="rainfall"
                  type="number"
                  value={weatherData.rainfall}
                  onChange={(e) => setWeatherData(prev => ({
                    ...prev,
                    rainfall: parseFloat(e.target.value) || 0
                  }))}
                  placeholder="450"
                />
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
                  onChange={(e) => setSoilData(prev => ({
                    ...prev,
                    N: parseFloat(e.target.value) || 0
                  }))}
                  placeholder="90"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phosphorus">{t('crop.phosphorus')}</Label>
                <Input
                  id="phosphorus"
                  type="number"
                  value={soilData.P}
                  onChange={(e) => setSoilData(prev => ({
                    ...prev,
                    P: parseFloat(e.target.value) || 0
                  }))}
                  placeholder="42"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="potassium">{t('crop.potassium')}</Label>
                <Input
                  id="potassium"
                  type="number"
                  value={soilData.K}
                  onChange={(e) => setSoilData(prev => ({
                    ...prev,
                    K: parseFloat(e.target.value) || 0
                  }))}
                  placeholder="43"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ph">{t('crop.ph')}</Label>
                <Input
                  id="ph"
                  type="number"
                  step="0.1"
                  value={soilData.ph}
                  onChange={(e) => setSoilData(prev => ({
                    ...prev,
                    ph: parseFloat(e.target.value) || 0
                  }))}
                  placeholder="6.5"
                />
              </div>
            </div>
          </div>

          {/* Crop Selection */}
          <div className="space-y-2">
            <Label htmlFor="crop">{t('calamity.selectCrop')}</Label>
            <Select value={selectedCrop} onValueChange={setSelectedCrop}>
              <SelectTrigger>
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
          </div>

          <Button 
            onClick={handlePredict} 
            disabled={calamityMutation.isPending}
            className="w-full"
          >
            {calamityMutation.isPending ? t('loading.analyzingShort') : t('calamity.predict')}
          </Button>
        </CardContent>
      </Card>

      {/* Prediction Results */}
      {prediction && (
        <div className="space-y-4">
          {/* Overall Risk Assessment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="text-primary w-5 h-5" />
                <span>{t('calamity.assessment')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                    <div className="text-sm text-muted-foreground font-medium">{t('crop.temperature')}</div>
                    <div className="text-2xl font-bold text-orange-900">{prediction.weather_conditions.temperature}°C</div>
                  </div>
                </div>
                <div className="flex items-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 rounded-xl">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-full mr-4">
                    <Droplets className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground font-medium">{t('crop.humidity')}</div>
                    <div className="text-2xl font-bold text-blue-900">{prediction.weather_conditions.humidity}%</div>
                  </div>
                </div>
                <div className="flex items-center p-4 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl">
                  <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full mr-4">
                    <CloudRain className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground font-medium">{t('crop.rainfall')}</div>
                    <div className="text-2xl font-bold text-indigo-900">{prediction.weather_conditions.rainfall}mm</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calamity Risks */}
          {prediction.calamities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('calamity.identifiedRisks')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {prediction.calamities.map((calamity: any, index: number) => (
                    <div key={index} className="p-5 border bg-card shadow-sm rounded-xl hover:shadow-md transition-shadow">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 bg-muted rounded-lg shrink-0">
                            {getCalamityIcon(calamity.type)}
                          </div>
                          <div>
                            <h4 className="text-lg font-bold">{t(`calamity.${calamity.type}`)}</h4>
                            <div className="flex items-center mt-1 space-x-2">
                              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                                calamity.severity === 'HIGH' ? 'bg-red-100 text-red-700' :
                                calamity.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {t(`risk.${calamity.severity}`)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="md:text-right md:min-w-[120px]">
                          <div className="text-sm text-muted-foreground mb-1">Probability</div>
                          <div className="flex items-center space-x-2">
                            <Progress value={calamity.probability * 100} className="w-20 h-2" />
                            <span className="font-bold">{Math.round(calamity.probability * 100)}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="mb-5 bg-muted/30 p-3 rounded-lg border border-muted">
                        <h5 className="text-sm font-semibold flex items-center space-x-1.5 mb-1.5 text-foreground/80">
                          <Info className="w-4 h-4 text-primary" />
                          <span>Why this prediction?</span>
                        </h5>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {calamity.description}
                        </p>
                      </div>

                      <div>
                        <h5 className="text-sm font-semibold flex items-center space-x-1.5 mb-3 text-foreground/80">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          <span>{t('calamity.recommendations')}</span>
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {calamity.recommendations.map((rec: string, idx: number) => (
                            <div key={idx} className="flex items-start space-x-3 p-3 bg-background border rounded-lg">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shadow-sm">
                                {idx + 1}
                              </span>
                              <span className="text-sm pt-0.5">{rec}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preventive Measures */}
          <Card>
            <CardHeader>
              <CardTitle>{t('calamity.preventive')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {prediction.preventive_measures.map((measure: string, index: number) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-muted/30 border rounded-lg hover:bg-muted/50 transition-colors">
                    <ArrowRight className="text-primary w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span className="text-sm leading-relaxed">{measure}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
