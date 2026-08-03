import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, Wheat, Popcorn, Download, Calendar, ArrowRight, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { format, isToday, isYesterday, subDays, isAfter } from 'date-fns';

interface PredictionHistoryProps {
  farmer: any;
  onMakePrediction: () => void;
}

export function PredictionHistory({ farmer, onMakePrediction }: PredictionHistoryProps) {
  const { t } = useTranslation();
  const [selectedPrediction, setSelectedPrediction] = useState<any>(null);

  const { data: historyData, isLoading } = useQuery({
    queryKey: ['/api/farmers', farmer.id, 'predictions'],
    enabled: !!farmer.id
  });

  const exportData = () => {
    if (!historyData || !(historyData as any).success) return;
    
    const data = {
      farmer: farmer.name,
      predictions: (historyData as any).predictions
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `farmadvisory-history-${farmer.name}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const allPredictions = (historyData && (historyData as any).success) ? [
    ...((historyData as any).predictions.crops || []).map((p: any) => ({ ...p, type: 'crop' })),
    ...((historyData as any).predictions.yields || []).map((p: any) => ({ ...p, type: 'yield' }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];

  // Group predictions by date categories
  const groupedPredictions = () => {
    const todayList: any[] = [];
    const yesterdayList: any[] = [];
    const lastWeekList: any[] = [];
    const earlierList: any[] = [];

    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);

    allPredictions.forEach(pred => {
      const date = new Date(pred.createdAt);
      if (isToday(date)) {
        todayList.push(pred);
      } else if (isYesterday(date)) {
        yesterdayList.push(pred);
      } else if (isAfter(date, sevenDaysAgo)) {
        lastWeekList.push(pred);
      } else {
        earlierList.push(pred);
      }
    });

    return [
      { title: 'Today', items: todayList },
      { title: 'Yesterday', items: yesterdayList },
      { title: 'Last Week', items: lastWeekList },
      { title: 'Earlier', items: earlierList }
    ].filter(group => group.items.length > 0);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50 animate-spin text-emerald-600" />
            <p className="text-muted-foreground font-medium">Loading history...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const groups = groupedPredictions();

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Clock className="text-emerald-600 w-5 h-5" />
            <span data-testid="history-title">{t('history.title')}</span>
          </CardTitle>
          {allPredictions && allPredictions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={exportData}
              data-testid="button-export-history"
              className="text-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              {t('history.export')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {groups.length > 0 ? (
          <div className="space-y-6">
            {groups.map(group => (
              <div key={group.title} className="space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b pb-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{group.title}</span>
                  <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full font-normal">
                    {group.items.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {group.items.map((prediction: any) => (
                    <div 
                      key={prediction.id} 
                      onClick={() => setSelectedPrediction(prediction)}
                      className="border rounded-xl p-4 bg-card hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all cursor-pointer shadow-sm hover:border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      data-testid={`prediction-${prediction.id}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl flex items-center justify-center shrink-0">
                          {prediction.type === 'crop' ? (
                            <Wheat className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Popcorn className="w-5 h-5 text-teal-600" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-sm capitalize" data-testid={`prediction-crop-${prediction.id}`}>
                              {prediction.crop}
                            </h3>
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-full">
                              {prediction.type === 'crop' ? 'Crop Rec' : 'Yield Forecast'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5" data-testid={`prediction-date-${prediction.id}`}>
                            {format(new Date(prediction.createdAt), 'MMM dd, yyyy · hh:mm a')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end space-x-4 border-t sm:border-t-0 pt-2 sm:pt-0">
                        <div className="text-right">
                          {prediction.type === 'crop' ? (
                            <>
                              <div className="font-bold text-sm text-emerald-700 dark:text-emerald-400" data-testid={`prediction-confidence-${prediction.id}`}>
                                {((prediction.confidence || 0.85) * 100).toFixed(1)}%
                              </div>
                              <div className="text-[10px] text-muted-foreground">Confidence</div>
                            </>
                          ) : (
                            <>
                              <div className="font-bold text-sm text-teal-700 dark:text-teal-400" data-testid={`prediction-production-${prediction.id}`}>
                                {(prediction.predictedProduction || 0).toFixed(1)} tons
                              </div>
                              <div className="text-[10px] text-muted-foreground">Est. Yield</div>
                            </>
                          )}
                        </div>

                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-emerald-600">
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12" data-testid="no-history">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-base mb-1">{t('history.empty')}</h3>
            <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
              {t('history.emptyDesc')}
            </p>
            <Button onClick={onMakePrediction} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold" data-testid="button-make-prediction">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              {t('history.makePrediction')}
            </Button>
          </div>
        )}

        {/* Prediction Detail Modal */}
        <Dialog open={!!selectedPrediction} onOpenChange={() => setSelectedPrediction(null)}>
          <DialogContent className="max-w-md rounded-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2 text-base font-bold">
                {selectedPrediction?.type === 'crop' ? <Wheat className="w-5 h-5 text-emerald-600" /> : <Popcorn className="w-5 h-5 text-teal-600" />}
                <span className="capitalize">{selectedPrediction?.crop} Record</span>
              </DialogTitle>
            </DialogHeader>

            {selectedPrediction && (
              <div className="space-y-4 pt-2 text-sm">
                <div className="p-3 bg-muted/40 rounded-lg flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Recorded On:</span>
                  <span className="font-semibold">{format(new Date(selectedPrediction.createdAt), 'EEEE, MMMM dd, yyyy hh:mm a')}</span>
                </div>

                {selectedPrediction.type === 'crop' ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg">
                        <span className="text-muted-foreground block">Predicted Crop</span>
                        <span className="font-bold text-emerald-800 dark:text-emerald-300 text-base capitalize">{selectedPrediction.crop}</span>
                      </div>
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg">
                        <span className="text-muted-foreground block">Confidence</span>
                        <span className="font-bold text-emerald-800 dark:text-emerald-300 text-base">{((selectedPrediction.confidence || 0.85) * 100).toFixed(1)}%</span>
                      </div>
                    </div>

                    {selectedPrediction.soilData && (
                      <div className="border rounded-lg p-3 space-y-1 text-xs">
                        <h4 className="font-semibold text-muted-foreground mb-2">Soil Parameters Used</h4>
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div className="bg-muted/50 p-2 rounded">
                            <div className="text-[10px] text-muted-foreground">N</div>
                            <div className="font-bold">{selectedPrediction.soilData.N}</div>
                          </div>
                          <div className="bg-muted/50 p-2 rounded">
                            <div className="text-[10px] text-muted-foreground">P</div>
                            <div className="font-bold">{selectedPrediction.soilData.P}</div>
                          </div>
                          <div className="bg-muted/50 p-2 rounded">
                            <div className="text-[10px] text-muted-foreground">K</div>
                            <div className="font-bold">{selectedPrediction.soilData.K}</div>
                          </div>
                          <div className="bg-muted/50 p-2 rounded">
                            <div className="text-[10px] text-muted-foreground">pH</div>
                            <div className="font-bold">{selectedPrediction.soilData.ph}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-lg">
                        <span className="text-muted-foreground block">Expected Production</span>
                        <span className="font-bold text-teal-800 dark:text-teal-300 text-base">{(selectedPrediction.predictedProduction || 0).toFixed(1)} tons</span>
                      </div>
                      <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-lg">
                        <span className="text-muted-foreground block">Farm Area</span>
                        <span className="font-bold text-teal-800 dark:text-teal-300 text-base">{selectedPrediction.area} ha</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
