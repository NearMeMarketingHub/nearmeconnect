import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { Document, Page, pdfjs } from "react-pdf";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import SignaturePad from "@/components/signature-pad";
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  PenLine,
  CheckCircle,
  AlertCircle,
  Loader2,
  Type,
  Calendar,
  CheckSquare
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface SigningField {
  id: string;
  packetId: string;
  participantId: string | null;
  fieldType: string;
  pageNumber: number;
  xPosition: string;
  yPosition: string;
  width: string;
  height: string;
  required: boolean;
  value: string | null;
  label: string | null;
}

interface SigningSession {
  packet: {
    id: string;
    title: string;
    message: string | null;
    documentUrl: string;
  };
  participant: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  fields: SigningField[];
}

export default function SignPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [session, setSession] = useState<SigningSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [containerWidth, setContainerWidth] = useState(800);
  
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [activeField, setActiveField] = useState<SigningField | null>(null);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setAccessToken(token);
    } else {
      setError("Invalid signing link. Please use the link from your email.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!accessToken) return;

    const fetchSession = async () => {
      try {
        const response = await fetch(`/api/public/signing/${accessToken}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to load signing session");
        }
        const data = await response.json();
        setSession(data);
        
        const initialValues: Record<string, string> = {};
        data.fields.forEach((field: SigningField) => {
          if (field.value) {
            initialValues[field.id] = field.value;
          }
        });
        setFieldValues(initialValues);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load signing session");
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [accessToken]);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth - 48);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  const handleFieldClick = (field: SigningField) => {
    if (field.fieldType === 'signature' || field.fieldType === 'initials') {
      setActiveField(field);
      setSignatureDialogOpen(true);
    }
  };

  const handleSignatureComplete = (signatureData: string) => {
    if (activeField) {
      setFieldValues(prev => ({
        ...prev,
        [activeField.id]: signatureData
      }));
      setSignatureDialogOpen(false);
      setActiveField(null);
    }
  };

  const handleTextChange = (fieldId: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleCheckboxChange = (fieldId: string, checked: boolean) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: checked ? 'checked' : '' }));
  };

  const handleDateClick = (fieldId: string) => {
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    setFieldValues(prev => ({ ...prev, [fieldId]: today }));
  };

  const validateFields = () => {
    if (!session) return false;
    const requiredFields = session.fields.filter(f => f.required);
    const missingFields = requiredFields.filter(f => !fieldValues[f.id]);
    return missingFields.length === 0;
  };

  const handleSubmit = async () => {
    if (!accessToken || !session) return;

    if (!validateFields()) {
      toast({
        title: "Missing required fields",
        description: "Please complete all required fields before submitting.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/public/signing/${accessToken}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldValues })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit signature");
      }

      setCompleted(true);
      toast({
        title: "Signature submitted!",
        description: "Your signature has been recorded successfully."
      });
    } catch (err) {
      toast({
        title: "Submission failed",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const currentPageFields = session?.fields.filter(f => f.pageNumber === currentPage) || [];
  const completedFieldsCount = session?.fields.filter(f => fieldValues[f.id]).length || 0;
  const totalFieldsCount = session?.fields.length || 0;

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'signature': return <PenLine className="w-3 h-3" />;
      case 'initials': return <Type className="w-3 h-3" />;
      case 'date': return <Calendar className="w-3 h-3" />;
      case 'checkbox': return <CheckSquare className="w-3 h-3" />;
      default: return <Type className="w-3 h-3" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Loading signing session...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <CardTitle className="text-destructive">Signing Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <CardTitle>Signature Complete!</CardTitle>
            <CardDescription>
              Your signature has been recorded successfully.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              You can close this window. A copy of the signed document will be sent to your email once all parties have signed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-primary" />
              <div>
                <h1 className="font-semibold">{session?.packet.title}</h1>
                <p className="text-sm text-muted-foreground">
                  Signing as {session?.participant.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">
                {completedFieldsCount} / {totalFieldsCount} fields
              </Badge>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !validateFields()}
                data-testid="button-submit-signature"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Complete Signing
              </Button>
            </div>
          </div>
        </div>
      </header>

      {session?.packet.message && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border-b">
          <div className="container mx-auto px-4 py-3">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {session.packet.message}
            </p>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm px-3">
              Page {currentPage} of {numPages || "?"}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.min(numPages || p, p + 1))}
              disabled={currentPage >= (numPages || 1)}
              data-testid="button-next-page"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
              data-testid="button-zoom-out"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm w-16 text-center">{Math.round(scale * 100)}%</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setScale(s => Math.min(2, s + 0.1))}
              data-testid="button-zoom-in"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Card ref={containerRef}>
          <CardContent className="p-6 overflow-auto">
            <div className="relative inline-block" style={{ margin: '0 auto', display: 'block' }}>
              {session?.packet.documentUrl && (
                <Document
                  file={session.packet.documentUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  }
                >
                  <Page
                    pageNumber={currentPage}
                    scale={scale}
                    width={containerWidth}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </Document>
              )}
              
              {currentPageFields.map(field => {
                const hasValue = !!fieldValues[field.id];
                const style: React.CSSProperties = {
                  position: 'absolute',
                  left: `${parseFloat(field.xPosition)}%`,
                  top: `${parseFloat(field.yPosition)}%`,
                  width: `${parseFloat(field.width)}%`,
                  minHeight: `${parseFloat(field.height)}%`,
                };

                if (field.fieldType === 'signature' || field.fieldType === 'initials') {
                  return (
                    <div
                      key={field.id}
                      style={style}
                      className={`cursor-pointer border-2 rounded transition-colors ${
                        hasValue 
                          ? 'border-green-500 bg-green-50/80' 
                          : 'border-dashed border-primary bg-primary/10 hover:bg-primary/20'
                      }`}
                      onClick={() => handleFieldClick(field)}
                      data-testid={`field-${field.fieldType}-${field.id}`}
                    >
                      {hasValue ? (
                        <img 
                          src={fieldValues[field.id]} 
                          alt={field.fieldType} 
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="flex items-center justify-center gap-1 h-full min-h-[32px] text-xs text-primary">
                          {getFieldIcon(field.fieldType)}
                          <span className="capitalize">{field.fieldType}</span>
                          {field.required && <span className="text-destructive">*</span>}
                        </div>
                      )}
                    </div>
                  );
                }

                if (field.fieldType === 'date') {
                  return (
                    <div
                      key={field.id}
                      style={style}
                      className={`border rounded px-2 py-1 cursor-pointer transition-colors ${
                        hasValue 
                          ? 'border-green-500 bg-white' 
                          : 'border-dashed border-primary bg-primary/10 hover:bg-primary/20'
                      }`}
                      onClick={() => handleDateClick(field.id)}
                      data-testid={`field-date-${field.id}`}
                    >
                      {hasValue ? (
                        <span className="text-xs">{fieldValues[field.id]}</span>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-primary">
                          <Calendar className="w-3 h-3" />
                          <span>Click to date</span>
                          {field.required && <span className="text-destructive">*</span>}
                        </div>
                      )}
                    </div>
                  );
                }

                if (field.fieldType === 'checkbox') {
                  return (
                    <div
                      key={field.id}
                      style={style}
                      className="flex items-center gap-2"
                      data-testid={`field-checkbox-${field.id}`}
                    >
                      <Checkbox
                        checked={fieldValues[field.id] === 'checked'}
                        onCheckedChange={(checked) => handleCheckboxChange(field.id, !!checked)}
                      />
                      {field.label && (
                        <span className="text-xs">{field.label}</span>
                      )}
                    </div>
                  );
                }

                return (
                  <Input
                    key={field.id}
                    style={style}
                    className={`text-sm ${
                      hasValue ? 'border-green-500' : 'border-primary'
                    }`}
                    placeholder={field.label || 'Enter text'}
                    value={fieldValues[field.id] || ''}
                    onChange={(e) => handleTextChange(field.id, e.target.value)}
                    data-testid={`field-text-${field.id}`}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end">
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={submitting || !validateFields()}
            data-testid="button-submit-signature-bottom"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Complete Signing
          </Button>
        </div>
      </div>

      <Dialog open={signatureDialogOpen} onOpenChange={(open) => {
        setSignatureDialogOpen(open);
        if (!open) setActiveField(null);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="w-5 h-5" />
              {activeField?.fieldType === 'initials' ? 'Add Your Initials' : 'Add Your Signature'}
            </DialogTitle>
          </DialogHeader>
          <SignaturePad
            onSignatureComplete={(signatureData) => handleSignatureComplete(signatureData)}
            signerName={session?.participant.name}
          />
          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setSignatureDialogOpen(false);
                setActiveField(null);
              }}
              data-testid="button-cancel-signature"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
