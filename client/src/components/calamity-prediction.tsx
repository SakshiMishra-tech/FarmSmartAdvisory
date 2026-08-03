import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CloudRain, Sun, Bug, Shield, AlertCircle, Thermometer, Droplets, Info } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
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
    if (!selectedCrop) {
      setCropError("Please select Crop.");
      toast({
        title: "Validation Error",
        description: "Please complete all required fields.",
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

      {/* Prediction Results */}
      {prediction && (
        <div className="space-y-4">
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
