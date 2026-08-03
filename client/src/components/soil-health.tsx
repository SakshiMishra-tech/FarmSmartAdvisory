import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Sprout, UploadCloud, CheckCircle2, AlertCircle, FileText, X, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiRequest } from '@/lib/queryClient';

interface SoilHealthProps {
  farmer: any;
}

interface SoilState {
  N: string;
  P: string;
  K: string;
  ph: string;
}

export function SoilHealth({ farmer }: SoilHealthProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [data, setData] = useState<SoilState>({ N: '', P: '', K: '', ph: '' });
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [previewData, setPreviewData] = useState<SoilState | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof SoilState, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load from local storage
  useEffect(() => {
    const draft = localStorage.getItem(`soil_draft_${farmer.id}`);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setData(parsed.data || { N: '', P: '', K: '', ph: '' });
        if (parsed.timestamp) {
          setLastSaved(new Date(parsed.timestamp));
        }
      } catch (e) {
        console.error('Failed to parse soil draft', e);
      }
    }
  }, [farmer.id]);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);

  // Validation
  const validateField = (name: keyof SoilState, value: string): string | undefined => {
    if (!value || value.trim() === '') return 'This field is required.';
    const num = parseFloat(value);
    if (isNaN(num)) return 'Must be a number';
    if (num < 0) return 'Cannot be negative';
    
    if (name === 'ph') {
      if (num < 0 || num > 14) return 'pH must be between 0 and 14';
    } else {
      if (num > 1000) return 'Value seems suspiciously high';
    }
    return undefined;
  };

  // Auto-save & validate on change
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const newErrors: Partial<Record<keyof SoilState, string>> = {};
    (Object.keys(data) as Array<keyof SoilState>).forEach(key => {
      if (data[key] !== '') {
        const err = validateField(key, data[key]);
        if (err) newErrors[key] = err;
      }
    });
    setErrors(newErrors);

    if (Object.values(data).some(v => v !== '')) {
      timeoutId = setTimeout(() => {
        localStorage.setItem(`soil_draft_${farmer.id}`, JSON.stringify({
          data,
          timestamp: new Date().toISOString()
        }));
        setLastSaved(new Date());
      }, 1000);
    }

    return () => clearTimeout(timeoutId);
  }, [data, farmer.id]);

  // Progress Calculation
  const getProgress = () => {
    const fields: Array<keyof SoilState> = ['N', 'P', 'K', 'ph'];
    const validCount = fields.filter(f => data[f] !== '' && !errors[f]).length;
    return (validCount / fields.length) * 100;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setIsSavedSuccess(false);
    setData(prev => ({ ...prev, [id]: value }));
  };

  // Handle SHC Upload & Document Validation with Progress
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExtractionError(null);
    setPreviewData(null);
    setUploadProgress(15);

    if (file.size > 10 * 1024 * 1024) {
      const msg = t('soilHealth.uploadTooLarge');
      setExtractionError(msg);
      toast({ title: t('soilHealth.uploadErrorTitle'), description: msg, variant: 'destructive' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsExtracting(true);
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => (prev < 85 ? prev + 15 : prev));
    }, 300);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await fetch('/api/soil-health/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: base64Data,
            mimeType: file.type || 'image/jpeg',
            fileName: file.name
          })
        });

        clearInterval(progressInterval);
        setUploadProgress(100);

        const result = await res.json();
        if (res.ok && result.success && result.data) {
          setPreviewData(result.data);
          setExtractionError(null);
          toast({
            title: t('soilHealth.validatedTitle'),
            description: t('soilHealth.validatedDescription'),
          });
        } else {
          const errorMsg = result.error || t('soilHealth.invalidDocument');
          setExtractionError(errorMsg);
          toast({
            title: t('soilHealth.invalidDocumentTitle'),
            description: errorMsg,
            variant: 'destructive',
          });
        }
      } catch (err: any) {
        clearInterval(progressInterval);
        console.error("Extraction error:", err);
        const errStr = t('soilHealth.analysisFailed');
        setExtractionError(errStr);
        toast({
          title: t('soilHealth.documentValidationErrorTitle'),
          description: errStr,
          variant: 'destructive',
        });
      } finally {
        setIsExtracting(false);
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      clearInterval(progressInterval);
      setIsExtracting(false);
      setUploadProgress(0);
      setExtractionError(t('soilHealth.readFileError'));
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsDataURL(file);
  };

  const applyPreview = () => {
    if (previewData) {
      setData(previewData);
      setPreviewData(null);
      toast({
        title: t('soilHealth.dataAppliedTitle'),
        description: t('soilHealth.dataAppliedDescription'),
      });
    }
  };

  const cancelPreview = () => {
    setPreviewData(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Partial<Record<keyof SoilState, string>> = {};
    (['N', 'P', 'K', 'ph'] as Array<keyof SoilState>).forEach(key => {
      const err = validateField(key, data[key]);
      if (err) newErrors[key] = err;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
        toast({
          title: t('soilHealth.validationErrorTitle'),
          description: t('soilHealth.validationErrorDescription'),
          variant: 'destructive'
        });
      return;
    }

    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      localStorage.removeItem(`soil_draft_${farmer.id}`);
      setIsSavedSuccess(true);
      
      toast({
        title: t('soilHealth.profileUpdatedTitle'),
        description: t('soilHealth.profileUpdatedDescription'),
      });
    } catch (error) {
      toast({
        title: t('soilHealth.saveFailedTitle'),
        description: t('soilHealth.saveFailedDescription'),
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = getProgress();

  return (
    <div className="flex flex-col space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Sprout className="w-5 h-5 text-primary" />
                <span>{t('soilHealth.title')}</span>
              </CardTitle>
              <CardDescription className="mt-1.5">
                {t('soilHealth.description')}
              </CardDescription>
            </div>
            
            {lastSaved && (
              <div className="flex items-center space-x-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full shrink-0">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                <span>{t('soilHealth.draftSavedAt', { time: lastSaved.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) })}</span>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-muted-foreground">{t('soilHealth.profileCompletion')}</span>
              <span className="font-bold text-primary">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {isSavedSuccess && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center space-x-3 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <h4 className="font-semibold text-sm">{t('soilHealth.profileUpdatedTitle')}</h4>
                <p className="text-xs text-emerald-700">{t('soilHealth.profileUpdatedDescription')}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Form Section */}
            <div className="lg:col-span-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="N">{t('soilHealth.nitrogenLabel')}</Label>
                    <Input
                      id="N"
                      value={data.N}
                      onChange={handleChange}
                      placeholder={t('soilHealth.nitrogenPlaceholder')}
                      className={errors.N ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {errors.N && <p className="text-xs text-destructive flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.N}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="P">{t('soilHealth.phosphorusLabel')}</Label>
                    <Input
                      id="P"
                      value={data.P}
                      onChange={handleChange}
                      placeholder={t('soilHealth.phosphorusPlaceholder')}
                      className={errors.P ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {errors.P && <p className="text-xs text-destructive flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.P}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="K">{t('soilHealth.potassiumLabel')}</Label>
                    <Input
                      id="K"
                      value={data.K}
                      onChange={handleChange}
                      placeholder={t('soilHealth.potassiumPlaceholder')}
                      className={errors.K ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {errors.K && <p className="text-xs text-destructive flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.K}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ph">{t('soilHealth.phLabel')}</Label>
                    <Input
                      id="ph"
                      value={data.ph}
                      onChange={handleChange}
                      placeholder={t('soilHealth.phPlaceholder')}
                      className={errors.ph ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {errors.ph && <p className="text-xs text-destructive flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.ph}</p>}
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center"><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2"/>{t('soilHealth.saving')}</span>
                    ) : (
                      <span className="flex items-center"><Save className="w-4 h-4 mr-2"/>{t('soilHealth.saveProfile')}</span>
                    )}
                  </Button>
                </div>
              </form>
            </div>

            {/* Upload Section */}
            <div className="lg:col-span-4 border-l-0 lg:border-l pl-0 lg:pl-8 pt-8 lg:pt-0">
              <div className="flex items-center space-x-2 mb-4">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-medium">{t('soilHealth.fastDataEntry')}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                {t('soilHealth.fastDataEntryDescription')}
              </p>

              {extractionError && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start space-x-2.5 text-xs text-destructive animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">{t('soilHealth.invalidDocumentTitle')}</p>
                    <p className="mt-0.5 text-destructive/90">{extractionError}</p>
                  </div>
                  <button onClick={() => setExtractionError(null)} className="text-destructive/70 hover:text-destructive">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {isExtracting ? (
                <div className="border-2 border-dashed border-primary/30 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-primary/5 min-h-48">
                  <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin mb-3"></div>
                  <h4 className="font-medium text-primary text-sm">{t('soilHealth.scanningDocument', { progress: uploadProgress })}</h4>
                  <Progress value={uploadProgress} className="h-1.5 w-full mt-3" />
                  <p className="text-xs text-muted-foreground mt-2">{t('soilHealth.extractingValues')}</p>
                </div>
              ) : previewData ? (
                <div className="border border-border bg-card rounded-xl shadow-sm overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="bg-primary/10 px-4 py-3 flex justify-between items-center border-b">
                    <span className="font-semibold text-sm text-primary flex items-center"><CheckCircle2 className="w-4 h-4 mr-1.5"/> {t('soilHealth.extractedValues')}</span>
                    <button onClick={cancelPreview} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4"/></button>
                  </div>
                  <div className="p-4 bg-muted/30 space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <Label className="text-[10px]">{t('soilHealth.nitrogenShort')}</Label>
                        <Input
                          value={previewData.N}
                          onChange={(e) => setPreviewData({ ...previewData, N: e.target.value })}
                          className="h-8 text-xs mt-0.5"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">{t('soilHealth.phosphorusShort')}</Label>
                        <Input
                          value={previewData.P}
                          onChange={(e) => setPreviewData({ ...previewData, P: e.target.value })}
                          className="h-8 text-xs mt-0.5"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">{t('soilHealth.potassiumShort')}</Label>
                        <Input
                          value={previewData.K}
                          onChange={(e) => setPreviewData({ ...previewData, K: e.target.value })}
                          className="h-8 text-xs mt-0.5"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">{t('soilHealth.phShort')}</Label>
                        <Input
                          value={previewData.ph}
                          onChange={(e) => setPreviewData({ ...previewData, ph: e.target.value })}
                          className="h-8 text-xs mt-0.5"
                        />
                      </div>
                    </div>
                    <Button onClick={applyPreview} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" size="sm">
                      {t('soilHealth.applyExtractedValues')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors rounded-xl p-8 flex flex-col items-center justify-center text-center bg-muted/20 cursor-pointer h-48"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="p-3 bg-background rounded-full shadow-sm mb-3 group-hover:scale-105 transition-transform">
                    <UploadCloud className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-medium text-sm">{t('soilHealth.clickToUpload')}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{t('soilHealth.uploadTypes')}</p>
                  <input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef} 
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
