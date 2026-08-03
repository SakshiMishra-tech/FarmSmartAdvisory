import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock, Wheat, Popcorn, Download, Search, CloudRain, ShieldAlert, FileText, Mic, Trash2, ChevronDown, ChevronUp, FileSpreadsheet, FileIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays, isAfter } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ActivityHistoryProps {
  farmer: any;
  onMakePrediction: () => void;
}

type FilterRange = 'all' | 'today' | 'week' | 'month';
type TypeFilter = 'all' | 'crop' | 'yield' | 'calamity' | 'voice' | 'soil' | 'weather';

export function ActivityHistory({ farmer, onMakePrediction }: ActivityHistoryProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [filter, setFilter] = useState<FilterRange>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: historyData, isLoading } = useQuery({
    queryKey: ['/api/farmers', farmer.id, 'history'],
    enabled: !!farmer.id
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string, id: string }) => {
      const res = await apiRequest('DELETE', `/api/history/${type}/${id}?farmerId=${farmer.id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/farmers', farmer.id, 'history'] });
      toast({ title: 'Deleted', description: 'Item removed from history successfully.' });
      setExpandedId(null);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete item.', variant: 'destructive' });
    }
  });

  const allActivities = useMemo(() => {
    const data = historyData as any;
    if (!data || !data.success) return [];
    
    const h = data.history;
    const combined = [
      ...(h.crops || []).map((p: any) => ({ ...p, type: 'crop', title: p.crop || 'Crop Recommendation' })),
      ...(h.yields || []).map((p: any) => ({ ...p, type: 'yield', title: p.crop || 'Yield Prediction' })),
      ...(h.calamities || []).map((p: any) => ({ ...p, type: 'calamity', title: `Risk: ${p.overallRisk || 'N/A'}` })),
      ...(h.voice || []).map((p: any) => ({ ...p, type: 'voice', title: p.query || 'Voice Query' })),
      ...(h.weather || []).map((p: any) => ({ ...p, type: 'weather', title: p.locationName || 'Weather Lookup' })),
      ...(h.soil || []).map((p: any) => ({ ...p, type: 'soil', title: `Soil pH: ${p.ph || 'N/A'}` }))
    ];

    return combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [historyData]);

  const filteredActivities = useMemo(() => {
    let result = allActivities;

    if (typeFilter !== 'all') {
      result = result.filter(item => item.type === typeFilter);
    }

    if (filter !== 'all') {
      const now = new Date();
      let thresholdDate = now;
      if (filter === 'today') thresholdDate = subDays(now, 1);
      if (filter === 'week') thresholdDate = subDays(now, 7);
      if (filter === 'month') thresholdDate = subDays(now, 30);
      
      result = result.filter(item => isAfter(new Date(item.createdAt), thresholdDate));
    }

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(item => 
        item.title?.toLowerCase().includes(s) || 
        item.type.toLowerCase().includes(s) ||
        JSON.stringify(item).toLowerCase().includes(s)
      );
    }

    return result;
  }, [allActivities, filter, typeFilter, search]);

  const exportCSV = () => {
    const headers = [t('history.exportDate'), t('history.exportTime'), t('history.exportType'), t('history.exportTitle'), t('history.exportDetails')];
    const rows = filteredActivities.map(a => [
      format(new Date(a.createdAt), 'yyyy-MM-dd'),
      format(new Date(a.createdAt), 'HH:mm:ss'),
      a.type.toUpperCase(),
      `"${(a.title || '').replace(/"/g, '""')}"`,
      `"${JSON.stringify(a).replace(/"/g, '""')}"`
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FarmAdvisory_History_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`${t('history.title')} - ${farmer.name}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`${t('history.generatedOn')}: ${format(new Date(), 'PPpp')}`, 14, 22);
    
    const tableData = filteredActivities.map(a => [
      format(new Date(a.createdAt), 'yyyy-MM-dd HH:mm'),
      a.type.toUpperCase(),
      a.title || '-'
    ]);

    autoTable(doc, {
      startY: 30,
      head: [[t('history.tableDateTime'), t('history.tableActivityType'), t('history.tableSummary')]],
      body: tableData,
    });

    doc.save(`FarmAdvisory_History_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const handleDelete = (e: React.MouseEvent, type: string, id: string) => {
    e.stopPropagation();
    deleteMutation.mutate({ type, id });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'crop': return <Wheat className="w-5 h-5 text-green-500" />;
      case 'yield': return <Popcorn className="w-5 h-5 text-yellow-500" />;
      case 'calamity': return <ShieldAlert className="w-5 h-5 text-red-500" />;
      case 'voice': return <Mic className="w-5 h-5 text-blue-500" />;
      case 'weather': return <CloudRain className="w-5 h-5 text-cyan-500" />;
      case 'soil': return <FileText className="w-5 h-5 text-amber-600" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-50 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium">{t('history.loading')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <CardTitle className="flex items-center space-x-2">
            <Clock className="text-primary w-5 h-5" />
            <span>{t('history.title')}</span>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('history.searchPlaceholder')}
                className="pl-8 h-9 w-[200px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {allActivities.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportCSV}>
                  <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                  {t('history.csv')}
                </Button>
                <Button variant="outline" size="sm" onClick={exportPDF}>
                  <FileIcon className="w-4 h-4 mr-2 text-red-600" />
                  {t('history.pdf')}
                </Button>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 mt-4 bg-muted/30 p-3 rounded-lg border">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">{t('history.dateRange')}</span>
            <div className="flex flex-wrap gap-2">
              <Button variant={filter === 'all' ? 'default' : 'secondary'} size="sm" onClick={() => setFilter('all')} className="h-8 text-xs">{t('history.all')}</Button>
              <Button variant={filter === 'today' ? 'default' : 'secondary'} size="sm" onClick={() => setFilter('today')} className="h-8 text-xs">{t('history.today')}</Button>
              <Button variant={filter === 'week' ? 'default' : 'secondary'} size="sm" onClick={() => setFilter('week')} className="h-8 text-xs">{t('history.last7Days')}</Button>
              <Button variant={filter === 'month' ? 'default' : 'secondary'} size="sm" onClick={() => setFilter('month')} className="h-8 text-xs">{t('history.last30Days')}</Button>
            </div>
          </div>
          <div className="sm:border-l sm:pl-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">{t('history.predictionType')}</span>
            <select 
              className="h-8 text-xs rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            >
              <option value="all">{t('history.allTypes')}</option>
              <option value="crop">{t('history.cropRecommendation')}</option>
              <option value="yield">{t('history.yieldPrediction')}</option>
              <option value="calamity">{t('history.calamityRisk')}</option>
              <option value="soil">{t('history.soilHealth')}</option>
              <option value="voice">{t('history.voiceAssistant')}</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filteredActivities.length > 0 ? (
          <div className="space-y-4">
            {filteredActivities.map((activity) => (
              <div 
                key={activity.id} 
                className="border rounded-lg p-4 bg-card hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between cursor-pointer" onClick={() => setExpandedId(expandedId === activity.id ? null : activity.id)}>
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center shrink-0">
                      {getIcon(activity.type)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-base capitalize flex items-center gap-2">
                        {activity.type === 'voice' ? t('history.voiceAssistant') : `${t('history.predictionPrefix')} ${activity.type}`}
                        <span className="text-xs font-normal text-muted-foreground px-2 py-0.5 bg-secondary rounded-full">
                          {format(new Date(activity.createdAt), 'h:mm a')}
                        </span>
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                        {activity.title}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-md hidden sm:block">
                      {format(new Date(activity.createdAt), 'MMM dd, yyyy')}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary">
                      {expandedId === activity.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {expandedId === activity.id && (
                  <div className="mt-4 pt-4 border-t animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4 bg-muted/30 p-4 rounded-lg">
                      {activity.type === 'crop' && (
                         <>
                           <div><span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">{t('history.confidence')}</span> <span className="font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">{(activity.confidence * 100).toFixed(1)}%</span></div>
                           <div><span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">{t('history.soilPhUsed')}</span> <span className="font-medium">{activity.soilData?.ph || 'N/A'}</span></div>
                         </>
                      )}
                      {activity.type === 'yield' && (
                         <>
                           <div><span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">{t('history.season')}</span> <span className="font-medium capitalize">{activity.season}</span></div>
                           <div><span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">{t('history.predictedYield')}</span> <span className="font-medium">{activity.predictedProduction?.toFixed(1)} tons</span></div>
                         </>
                      )}
                      {activity.type === 'voice' && (
                         <div className="col-span-2">
                           <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">{t('history.assistantResponse')}</span> 
                           <p className="font-medium mt-1 whitespace-pre-wrap leading-relaxed text-foreground/80 bg-background p-3 rounded border">{activity.response}</p>
                         </div>
                      )}
                      {activity.type === 'calamity' && (
                         <>
                           <div><span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">{t('history.riskScore')}</span> <span className="font-medium">{(activity.riskScore * 100).toFixed(0)}/100</span></div>
                           <div><span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">{t('history.status')}</span> <span className="font-medium capitalize">{activity.overallRisk}</span></div>
                         </>
                      )}
                      {activity.type === 'soil' && (
                         <>
                           <div><span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">{t('history.nitrogen')}</span> <span className="font-medium">{activity.N || 'N/A'}</span></div>
                           <div><span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">{t('history.phosphorus')}</span> <span className="font-medium">{activity.P || 'N/A'}</span></div>
                         </>
                      )}
                    </div>
                    
                    <div className="flex justify-end pt-2">
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={(e) => handleDelete(e, activity.type, activity.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {deleteMutation.isPending ? t('history.deleting') : t('history.deleteRecord')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/10">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-2">{t('history.noActivitiesFound')}</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
              {t('history.noActivitiesDescription')}
            </p>
            <Button onClick={onMakePrediction}>
              {t('history.makePrediction')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
