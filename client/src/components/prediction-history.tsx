import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Wheat, Popcorn, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';

interface PredictionHistoryProps {
  farmer: any;
  onMakePrediction: () => void;
}

export function PredictionHistory({ farmer, onMakePrediction }: PredictionHistoryProps) {
  const { t } = useTranslation();

  const { data: historyData, isLoading } = useQuery({
    queryKey: ['/api/farmers', farmer.id, 'predictions'],
    enabled: !!farmer.id
  });

  const exportData = () => {
    if (!historyData || !historyData.success) return;
    
    const data = {
      farmer: farmer.name,
      predictions: historyData.predictions
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `farmwise-history-${farmer.name}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const allPredictions = (historyData && historyData.success) ? [
    ...(historyData.predictions.crops || []).map((p: any) => ({ ...p, type: 'crop' })),
    ...(historyData.predictions.yields || []).map((p: any) => ({ ...p, type: 'yield' }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50 animate-spin" />
            <p className="text-muted-foreground">Loading history...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Clock className="text-primary w-5 h-5" />
            <span data-testid="history-title">{t('history.title')}</span>
          </CardTitle>
          {allPredictions && allPredictions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={exportData}
              data-testid="button-export-history"
            >
              <Download className="w-4 h-4 mr-2" />
              {t('history.export')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {allPredictions.length > 0 ? (
          <div className="space-y-4">
            {allPredictions.map((prediction: any) => (
              <div 
                key={prediction.id} 
                className="border rounded-lg p-4 hover:bg-accent/5 transition-colors"
                data-testid={`prediction-${prediction.id}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      {prediction.type === 'crop' ? (
                        <Wheat className="w-5 h-5 text-primary" />
                      ) : (
                        <Popcorn className="w-5 h-5 text-accent" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium" data-testid={`prediction-crop-${prediction.id}`}>
                        {prediction.crop}
                      </h3>
                      <p className="text-sm text-muted-foreground" data-testid={`prediction-date-${prediction.id}`}>
                        {format(new Date(prediction.createdAt), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {prediction.type === 'crop' ? (
                      <>
                        <div className="font-semibold" data-testid={`prediction-confidence-${prediction.id}`}>
                          {(prediction.confidence * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Confidence</div>
                      </>
                    ) : (
                      <>
                        <div className="font-semibold" data-testid={`prediction-production-${prediction.id}`}>
                          {prediction.predictedProduction.toFixed(1)} tons
                        </div>
                        <div className="text-sm text-muted-foreground">Production</div>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t text-sm">
                  {prediction.type === 'crop' ? (
                    <>
                      <div>
                        <span className="text-muted-foreground">Type</span>
                        <div>Recommendation</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Soil pH</span>
                        <div>{prediction.soilData?.ph || 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Advisory</span>
                        <div>{prediction.advisory?.length || 0} tips</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-muted-foreground">Season</span>
                        <div>{prediction.season}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Area</span>
                        <div>{prediction.area} ha</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Yield</span>
                        <div>{prediction.predictedYield.toFixed(1)} t/ha</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12" data-testid="no-history">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-2">{t('history.empty')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('history.emptyDesc')}
            </p>
            <Button onClick={onMakePrediction} data-testid="button-make-prediction">
              {t('history.makePrediction')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
