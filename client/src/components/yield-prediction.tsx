import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Tractor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { supportedCrops } from '@shared/schema';
import { formatUnit, formatNumber, getLocalizedCropName, getLocalizedSeasonName } from '@/lib/utils';

interface YieldPredictionProps {
  farmer: any;
}

export function YieldPrediction({ farmer }: YieldPredictionProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [yieldData, setYieldData] = useState({
    crop: '',
    season: '',
    area: '',
    year: new Date().getFullYear().toString()
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [prediction, setPrediction] = useState<any>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!yieldData.crop) newErrors.crop = "Please select Crop.";
    if (!yieldData.season) newErrors.season = "Please select Season.";
    if (!yieldData.area || yieldData.area.trim() === '') newErrors.area = "Please enter Farm Area.";
    if (!yieldData.year) newErrors.year = "Please select Year.";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast({
        title: "Validation Error",
        description: "Please complete all required fields.",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const predictionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/predict/yield', data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setPrediction(data.prediction);
        toast({
          title: "✅ Yield prediction completed.",
          description: `Expected production: ${formatNumber(data.prediction.predicted_production, farmer.language)} ${formatUnit('tons', farmer.language)}`,
        });
      } else {
        throw new Error(data.error || 'Prediction failed');
      }
    },
    onError: () => {
      toast({
        title: "Prediction Error",
        description: "We couldn't generate yield prediction. Please check your farm area and try again.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    const numericData = {
      ...yieldData,
      area: parseFloat(yieldData.area),
      year: parseInt(yieldData.year)
    };

    predictionMutation.mutate({
      farmerId: farmer.id,
      yieldData: numericData
    });
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Yield Prediction Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="text-primary w-5 h-5" />
            <span data-testid="yield-title">{t('yield.title')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
              <Label htmlFor="crop">{t('yield.crop')}</Label>
              <Select
                value={yieldData.crop}
                onValueChange={(value) => {
                  setErrors(prev => ({ ...prev, crop: '' }));
                  setYieldData(prev => ({ ...prev, crop: value }));
                }}
              >
                <SelectTrigger className={errors.crop ? 'border-destructive focus:ring-destructive' : ''} data-testid="select-crop">
                  <SelectValue placeholder={t('yield.selectCrop')} />
                </SelectTrigger>
                <SelectContent>
                  {supportedCrops.map((crop) => (
                    <SelectItem key={crop} value={crop}>
                      {t(getLocalizedCropName(crop, farmer.language))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.crop && <p className="text-xs text-destructive mt-1">{errors.crop}</p>}
            </div>
            
            <div>
              <Label htmlFor="season">{t('yield.season')}</Label>
              <Select
                value={yieldData.season}
                onValueChange={(value) => {
                  setErrors(prev => ({ ...prev, season: '' }));
                  setYieldData(prev => ({ ...prev, season: value }));
                }}
              >
                <SelectTrigger className={errors.season ? 'border-destructive focus:ring-destructive' : ''} data-testid="select-season">
                  <SelectValue placeholder={t('yield.selectSeason')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Kharif">{t(getLocalizedSeasonName('kharif', farmer.language))} (June-November)</SelectItem>
                  <SelectItem value="Rabi">{t(getLocalizedSeasonName('rabi', farmer.language))} (November-April)</SelectItem>
                  <SelectItem value="Summer">{t(getLocalizedSeasonName('summer', farmer.language))} (April-June)</SelectItem>
                </SelectContent>
              </Select>
              {errors.season && <p className="text-xs text-destructive mt-1">{errors.season}</p>}
            </div>
            
            <div>
              <Label htmlFor="area">{t('yield.area')}</Label>
              <Input
                id="area"
                type="number"
                placeholder={t('yield.enterArea', { unit: formatUnit('hectares', farmer.language) })}
                value={yieldData.area}
                onChange={(e) => {
                  setErrors(prev => ({ ...prev, area: '' }));
                  setYieldData(prev => ({ ...prev, area: e.target.value }));
                }}
                min="0.1"
                step="0.1"
                className={errors.area ? 'border-destructive focus-visible:ring-destructive' : ''}
                data-testid="input-area"
              />
              {errors.area ? (
                <p className="text-xs text-destructive mt-1">{errors.area}</p>
              ) : (
                <span className="text-xs text-muted-foreground">{formatUnit('hectares', farmer.language)}</span>
              )}
            </div>
            
            <div>
              <Label htmlFor="year">{t('yield.year')}</Label>
              <Select
                value={yieldData.year}
                onValueChange={(value) => {
                  setErrors(prev => ({ ...prev, year: '' }));
                  setYieldData(prev => ({ ...prev, year: value }));
                }}
              >
                <SelectTrigger className={errors.year ? 'border-destructive focus:ring-destructive' : ''} data-testid="select-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: new Date().getFullYear() - 2020 + 1 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.year && <p className="text-xs text-destructive mt-1">{errors.year}</p>}
            </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              disabled={predictionMutation.isPending}
              data-testid="button-predict-yield"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              {predictionMutation.isPending ? "Predicting Yield..." : t('yield.predict')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Yield Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Tractor className="text-primary w-5 h-5" />
            <span data-testid="forecast-title">{t('yield.forecast')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {prediction ? (
            <div className="space-y-4">
              {/* Production Statistics */}
              <div className="text-center p-6 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg">
                <div className="text-3xl font-bold text-primary mb-1" data-testid="predicted-production">
                  {formatNumber(prediction.predicted_production, farmer.language)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t('yield.production')}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-md">
                  <div className="text-xl font-semibold" data-testid="yield-per-hectare">
                    {formatNumber(prediction.predicted_yield, farmer.language)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('yield.perHectare')}
                  </div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-md">
                  <div className="text-xl font-semibold" data-testid="total-area">
                    {prediction.area}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatUnit('hectares', farmer.language)}
                  </div>
                </div>
              </div>

              {/* Yield Factors */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium" data-testid="factors-title">
                  {t('yield.factors')}
                </h4>
                <div className="space-y-2">
                  {[
                    { label: t('yield.soilQuality'), value: 80, status: t('yield.good') },
                    { label: t('yield.weatherConditions'), value: 90, status: t('yield.excellent') },
                    { label: t('yield.seasonalTiming'), value: 70, status: t('yield.average') }
                  ].map((factor, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{factor.label}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 h-2 bg-muted rounded-full">
                          <div 
                            className={`h-2 rounded-full ${
                              factor.value >= 80 ? 'bg-primary' : 
                              factor.value >= 70 ? 'bg-accent' : 'bg-orange-500'
                            }`}
                            style={{ width: `${factor.value}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">{factor.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground" data-testid="no-yield-prediction">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('yield.noPrediction')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
