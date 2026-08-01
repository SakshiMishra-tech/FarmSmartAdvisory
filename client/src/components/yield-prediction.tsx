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
  
  const [prediction, setPrediction] = useState<any>(null);

  const predictionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/predict/yield', data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setPrediction(data.prediction);
        toast({
          title: t('yield.complete'),
          description: `Expected production: ${formatNumber(data.prediction.predicted_production, farmer.language)} ${formatUnit('tons', farmer.language)}`,
        });
      } else {
        throw new Error(data.error || 'Prediction failed');
      }
    },
    onError: (error) => {
      toast({
        title: t('yield.failed'),
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
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
    <div className="grid md:grid-cols-2 gap-6">
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
            <div>
              <Label htmlFor="crop">{t('yield.crop')}</Label>
              <Select
                value={yieldData.crop}
                onValueChange={(value) => setYieldData(prev => ({ ...prev, crop: value }))}
                required
              >
                <SelectTrigger data-testid="select-crop">
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
            </div>
            
            <div>
              <Label htmlFor="season">{t('yield.season')}</Label>
              <Select
                value={yieldData.season}
                onValueChange={(value) => setYieldData(prev => ({ ...prev, season: value }))}
                required
              >
                <SelectTrigger data-testid="select-season">
                  <SelectValue placeholder={t('yield.selectSeason')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Kharif">{t(getLocalizedSeasonName('kharif', farmer.language))} (June-November)</SelectItem>
                  <SelectItem value="Rabi">{t(getLocalizedSeasonName('rabi', farmer.language))} (November-April)</SelectItem>
                  <SelectItem value="Summer">{t(getLocalizedSeasonName('summer', farmer.language))} (April-June)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="area">{t('yield.area')}</Label>
              <Input
                id="area"
                type="number"
                placeholder={t('yield.enterArea', { unit: formatUnit('hectares', farmer.language) })}
                value={yieldData.area}
                onChange={(e) => setYieldData(prev => ({ ...prev, area: e.target.value }))}
                required
                min="0.1"
                step="0.1"
                data-testid="input-area"
              />
              <span className="text-xs text-muted-foreground">{formatUnit('hectares', farmer.language)}</span>
            </div>
            
            <div>
              <Label htmlFor="year">{t('yield.year')}</Label>
              <Select
                value={yieldData.year}
                onValueChange={(value) => setYieldData(prev => ({ ...prev, year: value }))}
                required
              >
                <SelectTrigger data-testid="select-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2023, 2022].map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={predictionMutation.isPending}
              data-testid="button-predict-yield"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              {predictionMutation.isPending ? t('loading.predicting') : t('yield.predict')}
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
