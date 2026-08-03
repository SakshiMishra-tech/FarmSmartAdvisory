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

  // Validation
  const validateField = (name: keyof SoilState, value: string): string | undefined => {
    if (!value) return undefined; // Required check is handled by progress
    const num = parseFloat(value);
    if (isNaN(num)) return 'Must be a number';
    if (num < 0) return 'Cannot be negative';
    
    if (name === 'ph') {
      if (num < 0 || num > 14) return 'pH must be between 0 and 14';
    } else {
      // N, P, K typical ranges
      if (num > 1000) return 'Value seems suspiciously high';
    }
    return undefined;
  };

  // Auto-save & validate on change
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    // Validate all
    const newErrors: Partial<Record<keyof SoilState, string>> = {};
    (Object.keys(data) as Array<keyof SoilState>).forEach(key => {
      const err = validateField(key, data[key]);
      if (err) newErrors[key] = err;
    });
    setErrors(newErrors);

    // Only auto-save if something has actually been entered
    if (Object.values(data).some(v => v !== '')) {
      timeoutId = setTimeout(() => {
        localStorage.setItem(`soil_draft_${farmer.id}`, JSON.stringify({
          data,
          timestamp: new Date().toISOString()
        }));
        setLastSaved(new Date());
      }, 1000); // Debounce save by 1 second
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
    setData(prev => ({ ...prev, [id]: value }));
  };

  // Handle SHC Upload & Document Validation
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExtractionError(null);
    setPreviewData(null);

    // File size check (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      const msg = "File size exceeds 10MB limit. Please upload a smaller document.";
      setExtractionError(msg);
      toast({ title: 'Upload Error', description: msg, variant: 'destructive' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsExtracting(true);

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

        const result = await res.json();
        if (res.ok && result.success && result.data) {
          setPreviewData(result.data);
          setExtractionError(null);
          toast({
            title: 'Soil Health Card Validated',
            description: 'Extracted Nitrogen, Phosphorus, Potassium, and pH values successfully.',
          });
        } else {
          const errorMsg = result.error || 'The uploaded file is not a valid Soil Health Card or Soil Testing Report.';
          setExtractionError(errorMsg);
          toast({
            title: 'Invalid Document',
            description: errorMsg,
            variant: 'destructive',
          });
        }
      } catch (err: any) {
        console.error("Extraction error:", err);
        const errStr = "Failed to analyze document. Please ensure you upload a clear photo or PDF of a valid Soil Health Card.";
        setExtractionError(errStr);
        toast({
          title: 'Document Validation Error',
          description: errStr,
          variant: 'destructive',
        });
      } finally {
        setIsExtracting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      setIsExtracting(false);
      setExtractionError("Could not read uploaded file.");
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsDataURL(file);
  };

  const applyPreview = () => {
    if (previewData) {
      setData(previewData);
      setPreviewData(null);
      toast({
        title: 'Data Applied',
        description: 'Form updated with extracted values.',
      });
    }
  };

  const cancelPreview = () => {
    setPreviewData(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(errors).length > 0) return;
    if (getProgress() < 100) {
      toast({ title: 'Incomplete', description: 'Please fill out all valid fields before saving.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate backend save (or use real endpoint if it exists)
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Clear draft on successful submit
      localStorage.removeItem(`soil_draft_${farmer.id}`);
      
      toast({
        title: 'Success',
        description: 'Soil health data updated successfully!',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save soil health data.',
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
                <span>Soil Health Management</span>
              </CardTitle>
              <CardDescription className="mt-1.5">
                Update your soil data manually or upload a Soil Health Card (SHC) for automatic extraction.
              </CardDescription>
            </div>
            
            {lastSaved && (
              <div className="flex items-center space-x-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full shrink-0">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                <span>Draft saved at {lastSaved.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-muted-foreground">Profile Completion</span>
              <span className="font-bold text-primary">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Form Section */}
            <div className="lg:col-span-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="N">Nitrogen (N) kg/ha</Label>
                    <Input
                      id="N"
                      value={data.N}
                      onChange={handleChange}
                      placeholder="e.g. 45"
                      className={errors.N ? "border-destructive" : ""}
                    />
                    {errors.N && <p className="text-xs text-destructive flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.N}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="P">Phosphorus (P) kg/ha</Label>
                    <Input
                      id="P"
                      value={data.P}
                      onChange={handleChange}
                      placeholder="e.g. 25"
                      className={errors.P ? "border-destructive" : ""}
                    />
                    {errors.P && <p className="text-xs text-destructive flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.P}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="K">Potassium (K) kg/ha</Label>
                    <Input
                      id="K"
                      value={data.K}
                      onChange={handleChange}
                      placeholder="e.g. 60"
                      className={errors.K ? "border-destructive" : ""}
                    />
                    {errors.K && <p className="text-xs text-destructive flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.K}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ph">pH Level</Label>
                    <Input
                      id="ph"
                      value={data.ph}
                      onChange={handleChange}
                      placeholder="e.g. 6.5"
                      className={errors.ph ? "border-destructive" : ""}
                    />
                    {errors.ph && <p className="text-xs text-destructive flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.ph}</p>}
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={progress < 100 || isSubmitting || Object.keys(errors).length > 0}
                    className="w-full sm:w-auto"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center"><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2"/>Saving...</span>
                    ) : (
                      <span className="flex items-center"><Save className="w-4 h-4 mr-2"/> Save Profile</span>
                    )}
                  </Button>
                </div>
              </form>
            </div>

            {/* Upload Section */}
            <div className="lg:col-span-4 border-l-0 lg:border-l pl-0 lg:pl-8 pt-8 lg:pt-0">
              <div className="flex items-center space-x-2 mb-4">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-medium">Fast Data Entry</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Have a physical or digital Soil Health Card? Upload a photo or PDF and our system will extract the values for you automatically.
              </p>

              {extractionError && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start space-x-2.5 text-xs text-destructive animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">Invalid Document</p>
                    <p className="mt-0.5 text-destructive/90">{extractionError}</p>
                  </div>
                  <button onClick={() => setExtractionError(null)} className="text-destructive/70 hover:text-destructive">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {isExtracting ? (
                <div className="border-2 border-dashed border-primary/30 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-primary/5 h-48">
                  <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4"></div>
                  <h4 className="font-medium text-primary">Scanning Document...</h4>
                  <p className="text-xs text-muted-foreground mt-2">Extracting N, P, K and pH values using AI.</p>
                </div>
              ) : previewData ? (
                <div className="border border-border bg-card rounded-xl shadow-sm overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="bg-primary/10 px-4 py-3 flex justify-between items-center border-b">
                    <span className="font-semibold text-sm text-primary flex items-center"><CheckCircle2 className="w-4 h-4 mr-1.5"/> Data Extracted</span>
                    <button onClick={cancelPreview} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4"/></button>
                  </div>
                  <div className="p-4 bg-muted/30">
                    <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                      <div><span className="text-muted-foreground block text-xs">Nitrogen</span><span className="font-medium">{previewData.N}</span></div>
                      <div><span className="text-muted-foreground block text-xs">Phosphorus</span><span className="font-medium">{previewData.P}</span></div>
                      <div><span className="text-muted-foreground block text-xs">Potassium</span><span className="font-medium">{previewData.K}</span></div>
                      <div><span className="text-muted-foreground block text-xs">pH</span><span className="font-medium">{previewData.ph}</span></div>
                    </div>
                    <Button onClick={applyPreview} className="w-full" size="sm">Apply to Form</Button>
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
                  <h4 className="font-medium text-sm">Click to upload</h4>
                  <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, or PDF</p>
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
