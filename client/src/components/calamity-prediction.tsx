import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CloudRain, Sun, Bug, Shield, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { supportedCrops } from '@shared/schema';
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
              <div className={`p-4 rounded-lg border-2 ${getRiskColor(prediction.overall_risk)}`}>
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2">
                    {t(`risk.${prediction.overall_risk}`)}
                  </div>
                  <div className="text-sm opacity-75">
                    {t('calamity.riskScore')}: {prediction.risk_score}/3.0
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
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{prediction.weather_conditions.temperature}°C</div>
                  <div className="text-sm text-muted-foreground">{t('crop.temperature')}</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{prediction.weather_conditions.humidity}%</div>
                  <div className="text-sm text-muted-foreground">{t('crop.humidity')}</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{prediction.weather_conditions.rainfall}mm</div>
                  <div className="text-sm text-muted-foreground">{t('crop.rainfall')}</div>
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
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center space-x-3 mb-2">
                        {getCalamityIcon(calamity.type)}
                        <div>
                          <h4 className="font-medium">{t(`calamity.${calamity.type}`)}</h4>
                          <div className={`text-sm px-2 py-1 rounded-full inline-block ${
                            calamity.severity === 'HIGH' ? 'bg-red-100 text-red-700' :
                            calamity.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {t(`risk.${calamity.severity}`)} ({Math.round(calamity.probability * 100)}%)
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {calamity.description}
                      </p>
                      <div>
                        <h5 className="font-medium mb-2">{t('calamity.recommendations')}</h5>
                        <ul className="text-sm space-y-1">
                          {calamity.recommendations.map((rec: string, idx: number) => (
                            <li key={idx} className="flex items-start space-x-2">
                              <span className="text-primary">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
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
              <ul className="space-y-2">
                {prediction.preventive_measures.map((measure: string, index: number) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-primary">•</span>
                    <span>{measure}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
