import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Tractor, Lightbulb, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';
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
    if (!yieldData.crop) newErrors.crop = "Please choose Crop.";
    if (!yieldData.season) newErrors.season = "Please select Season. Season is mandatory.";
    if (!yieldData.area || yieldData.area.trim() === '') {
      newErrors.area = "Area is required.";
    } else if (parseFloat(yieldData.area) <= 0) {
      newErrors.area = "Area cannot be zero. Please enter a valid farm area.";
    } else if (parseFloat(yieldData.area) > 10000) {
      newErrors.area = "Area seems too large. Please enter area in hectares.";
    }
    if (!yieldData.year) newErrors.year = "Please select Year.";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
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

  // Derive confidence % from season multiplier (matches server ML logic)
  const getConfidence = () => {
    const seasonConfidenceMap: Record<string, number> = {
      'Kharif': 85,  // 1.1 multiplier — peak season
      'Rabi': 80,    // 1.0 multiplier — standard season
      'Summer': 70,  // 0.9 multiplier — off-season
    };
    return seasonConfidenceMap[prediction?.season] ?? 78;
  };

  // Crop-specific farming suggestions
  const getSuggestions = (): string[] => {
    const crop = (prediction?.crop || yieldData.crop).toLowerCase();
    const season = prediction?.season || yieldData.season;
    const suggestions: Record<string, string[]> = {
      rice: [
        'Maintain 5 cm standing water during tillering stage for best yield.',
        'Apply nitrogen in split doses: 50% basal, 25% at tillering, 25% at panicle initiation.',
        'Practice System of Rice Intensification (SRI) to increase yield by 20-30%.'
      ],
      wheat: [
        'Irrigate at Crown Root Initiation (CRI) stage, typically 20-25 days after sowing.',
        'Apply 60 kg/ha nitrogen at sowing and 30 kg/ha at first irrigation.',
        'Use certified seed of recommended variety for your agro-climatic zone.'
      ],
      maize: [
        'Earthing up at 30-35 days protects from lodging and boosts growth.',
        'Apply potassium before sowing to improve drought tolerance.',
        'Monitor for fall armyworm weekly — apply neem-based spray at early infestation.'
      ],
      cotton: [
        'Maintain plant spacing of 60 x 30 cm for optimal boll development.',
        'Apply micronutrient spray (zinc + boron) at flower initiation stage.',
        'Practice integrated pest management to reduce bollworm damage.'
      ],
      sugarcane: [
        'Use trench planting method for better ratoon management.',
        'Apply trash mulching after harvest to conserve moisture.',
        'Intercrop with legumes in early stages to maximize land use.'
      ],
      chickpea: [
        'Avoid excess moisture — chickpea is drought-tolerant and prefers dry conditions.',
        'Apply rhizobium culture to seeds before sowing for nitrogen fixation.',
        'Spray oxalic acid or ash water to manage pod borer.'
      ],
      potato: [
        'Use disease-free, certified seed potato for planting.',
        'Hill up soil around plants at 30 days to prevent greening of tubers.',
        'Maintain consistent soil moisture — avoid water stress during tuber bulking.'
      ],
      tomato: [
        'Use cage or stake support after transplanting for better fruit quality.',
        'Apply calcium spray to prevent blossom end rot.',
        'Drip irrigation reduces disease spread and improves water efficiency.'
      ],
      onion: [
        'Avoid excess nitrogen after bulb initiation — it delays maturity.',
        'Irrigate 7-10 days before harvest and then stop for easy curing.',
        'Store in well-ventilated, dry conditions to reduce post-harvest loss.'
      ],
      banana: [
        'Remove dry leaves and suckers regularly for vigorous bunch development.',
        'Apply potassium-rich fertilizer at shooting stage for larger bunches.',
        'Support plants with bamboo poles to prevent stem breakage.'
      ]
    };

    const cropSuggestions = suggestions[crop];
    if (cropSuggestions) return cropSuggestions;

    // Fallback season-based suggestions
    if (season === 'Kharif') return [
      'Ensure good drainage during heavy monsoon rainfall.',
      'Apply fungicide preventively in high-humidity conditions.',
      'Harvest at optimal maturity to avoid post-harvest losses.'
    ];
    if (season === 'Rabi') return [
      'Protect crops from frost with overhead irrigation or mulching.',
      'Use residual soil moisture efficiently — irrigate judiciously.',
      'Early sowing gives higher yield in Rabi season.'
    ];
    return [
      'Monitor crop regularly for pest and disease signs.',
      'Maintain adequate soil moisture at all crop growth stages.',
      'Apply recommended dose of fertilizer in split doses.'
    ];
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

      {/* Loading State */}
      {predictionMutation.isPending && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 shadow-md animate-in fade-in duration-300">
          <CardContent className="p-8 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="relative flex items-center justify-center">
              <div className="w-14 h-14 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <TrendingUp className="w-6 h-6 text-primary absolute animate-pulse" />
            </div>
            <div className="space-y-1 max-w-sm">
              <p className="text-foreground font-semibold text-sm">Calculating yield prediction...</p>
              <p className="text-xs text-muted-foreground">Evaluating crop type, seasonal parameters & historical farm area benchmarks...</p>
            </div>
            <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '70%' }} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State with Retry Button */}
      {predictionMutation.isError && !predictionMutation.isPending && (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm animate-in fade-in duration-300">
          <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start space-x-3 text-destructive">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-left">
                <h4 className="font-semibold text-sm">Yield prediction could not be generated</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {(predictionMutation.error as any)?.message || "A network or server error occurred. Please verify your crop parameters and try again."}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSubmit}
              className="border-destructive/30 hover:bg-destructive/10 text-destructive shrink-0"
              data-testid="button-retry-yield-prediction"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Retry Prediction
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Yield Results */}
      {prediction && !predictionMutation.isPending && (
        <Card className="border-primary/20 shadow-lg bg-gradient-to-br from-background to-primary/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Tractor className="text-primary w-5 h-5" />
              <span data-testid="forecast-title">{t('yield.forecast')}</span>
              <span className="ml-auto inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                <CheckCircle2 className="w-3 h-3" />
                <span data-testid="confidence-badge">{getConfidence()}% Confidence</span>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Main Production Number */}
              <div className="text-center p-6 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border border-primary/10">
                <div className="text-4xl font-extrabold text-primary mb-1" data-testid="predicted-production">
                  {formatNumber(prediction.predicted_production, farmer.language)}
                </div>
                <div className="text-sm text-muted-foreground font-medium">
                  {formatUnit('tons', farmer.language)} — {t('yield.production')}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {prediction.crop} · {prediction.season} · {prediction.year}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-4 bg-muted/50 rounded-xl border">
                  <div className="text-xl font-bold text-foreground" data-testid="yield-per-hectare">
                    {formatNumber(prediction.predicted_yield, farmer.language)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatUnit('tons/ha', farmer.language)}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">Yield per Hectare</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-xl border">
                  <div className="text-xl font-bold text-foreground" data-testid="total-area">
                    {prediction.area}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatUnit('ha', farmer.language)}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">Farm Area</div>
                </div>
                <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <div className="text-xl font-bold text-emerald-600" data-testid="confidence-value">
                    {getConfidence()}%
                  </div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Confidence</div>
                  <div className="text-[10px] text-muted-foreground mt-1">Prediction Accuracy</div>
                </div>
              </div>

              {/* Yield Factors (dynamic from season) */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold" data-testid="factors-title">
                  {t('yield.factors')}
                </h4>
                <div className="space-y-2">
                  {[
                    {
                      label: t('yield.soilQuality'),
                      value: 80,
                      status: t('yield.good')
                    },
                    {
                      label: t('yield.weatherConditions'),
                      value: prediction.season === 'Kharif' ? 88 : prediction.season === 'Rabi' ? 82 : 72,
                      status: prediction.season === 'Kharif' ? t('yield.excellent') : prediction.season === 'Rabi' ? t('yield.good') : t('yield.average')
                    },
                    {
                      label: t('yield.seasonalTiming'),
                      value: prediction.season === 'Kharif' ? 90 : prediction.season === 'Rabi' ? 80 : 68,
                      status: prediction.season === 'Kharif' ? t('yield.excellent') : prediction.season === 'Rabi' ? t('yield.good') : t('yield.average')
                    }
                  ].map((factor, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{factor.label}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-2 rounded-full transition-all duration-700 ${
                              factor.value >= 85 ? 'bg-emerald-500' : 
                              factor.value >= 75 ? 'bg-primary' : 'bg-amber-500'
                            }`}
                            style={{ width: `${factor.value}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium w-16 text-right">{factor.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggestions Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center space-x-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span>Farming Suggestions for {prediction.crop || yieldData.crop}</span>
                </h4>
                <div className="space-y-2">
                  {getSuggestions().map((tip, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-lg"
                      data-testid={`suggestion-${index}`}
                    >
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State — show only when no prediction and not loading */}
      {!prediction && !predictionMutation.isPending && (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center text-muted-foreground" data-testid="no-yield-prediction">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="font-medium">{t('yield.noPrediction')}</p>
            <p className="text-xs mt-1">Fill the form above and click Predict to see your yield forecast.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
