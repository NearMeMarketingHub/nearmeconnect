import { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Pen, 
  Type, 
  Calendar, 
  CheckSquare,
  Hash,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  GripVertical
} from "lucide-react";
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface SigningFieldPlacement {
  id: string;
  participantId: string | null;
  type: "signature" | "initials" | "date" | "text" | "checkbox";
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  label: string | null;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  color: string;
}

interface PdfFieldPlacerProps {
  pdfUrl: string;
  fields: SigningFieldPlacement[];
  participants: Participant[];
  onFieldsChange: (fields: SigningFieldPlacement[]) => void;
  readOnly?: boolean;
}

const fieldTypeIcons = {
  signature: Pen,
  initials: Hash,
  date: Calendar,
  text: Type,
  checkbox: CheckSquare,
};

const fieldTypeLabels = {
  signature: "Signature",
  initials: "Initials",
  date: "Date",
  text: "Text",
  checkbox: "Checkbox",
};

const defaultFieldSizes = {
  signature: { width: 200, height: 60 },
  initials: { width: 80, height: 40 },
  date: { width: 150, height: 30 },
  text: { width: 200, height: 30 },
  checkbox: { width: 24, height: 24 },
};

const participantColors = [
  "hsl(210, 100%, 60%)",
  "hsl(140, 70%, 45%)",
  "hsl(280, 80%, 60%)",
  "hsl(30, 90%, 55%)",
  "hsl(0, 80%, 60%)",
];

export default function PdfFieldPlacer({
  pdfUrl,
  fields,
  participants,
  onFieldsChange,
  readOnly = false,
}: PdfFieldPlacerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    fieldId: string;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [resizeState, setResizeState] = useState<{
    fieldId: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth - 32);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const getParticipantColor = (participantId: string | null) => {
    if (!participantId) return "hsl(0, 0%, 50%)";
    const index = participants.findIndex((p) => p.id === participantId);
    return participantColors[index % participantColors.length];
  };

  const addField = (type: SigningFieldPlacement["type"], participantId: string | null) => {
    const newField: SigningFieldPlacement = {
      id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      participantId,
      type,
      page: currentPage,
      x: 100,
      y: 100,
      width: defaultFieldSizes[type].width,
      height: defaultFieldSizes[type].height,
      required: true,
      label: null,
    };
    onFieldsChange([...fields, newField]);
    setSelectedFieldId(newField.id);
  };

  const removeField = (fieldId: string) => {
    onFieldsChange(fields.filter((f) => f.id !== fieldId));
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  };

  const updateField = (fieldId: string, updates: Partial<SigningFieldPlacement>) => {
    onFieldsChange(
      fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f))
    );
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, fieldId: string) => {
      if (readOnly) return;
      e.stopPropagation();
      setSelectedFieldId(fieldId);
      const field = fields.find((f) => f.id === fieldId);
      if (!field) return;

      const rect = e.currentTarget.getBoundingClientRect();
      setDragState({
        fieldId,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
      });
    },
    [readOnly, fields]
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, fieldId: string) => {
      if (readOnly) return;
      e.stopPropagation();
      const field = fields.find((f) => f.id === fieldId);
      if (!field) return;

      setResizeState({
        fieldId,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: field.width,
        startHeight: field.height,
      });
    },
    [readOnly, fields]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragState && containerRef.current) {
        const container = containerRef.current.querySelector(".react-pdf__Page");
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left - dragState.offsetX, rect.width - 50));
        const y = Math.max(0, Math.min(e.clientY - rect.top - dragState.offsetY, rect.height - 30));
        updateField(dragState.fieldId, {
          x: x / scale,
          y: y / scale,
        });
      }

      if (resizeState) {
        const deltaX = e.clientX - resizeState.startX;
        const deltaY = e.clientY - resizeState.startY;
        const newWidth = Math.max(50, resizeState.startWidth + deltaX / scale);
        const newHeight = Math.max(20, resizeState.startHeight + deltaY / scale);
        updateField(resizeState.fieldId, {
          width: newWidth,
          height: newHeight,
        });
      }
    };

    const handleMouseUp = () => {
      setDragState(null);
      setResizeState(null);
    };

    if (dragState || resizeState) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragState, resizeState, scale, updateField]);

  const currentPageFields = fields.filter((f) => f.page === currentPage);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b bg-card">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            data-testid="button-prev-page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm min-w-[80px] text-center" data-testid="text-page-number">
            Page {currentPage} of {numPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage === numPages}
            data-testid="button-next-page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
            data-testid="button-zoom-out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setScale((s) => Math.min(2, s + 0.1))}
            data-testid="button-zoom-in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {!readOnly && (
          <div className="w-64 border-r bg-muted/30 p-3 overflow-y-auto flex-shrink-0">
            <h3 className="text-sm font-medium mb-3">Add Fields</h3>
            
            {participants.length > 0 ? (
              participants.map((participant, idx) => (
                <div key={participant.id} className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: participantColors[idx % participantColors.length] }}
                    />
                    <span className="text-xs font-medium truncate">{participant.name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {(Object.keys(fieldTypeIcons) as Array<keyof typeof fieldTypeIcons>).map((type) => {
                      const Icon = fieldTypeIcons[type];
                      return (
                        <Button
                          key={type}
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs justify-start gap-1 px-2"
                          onClick={() => addField(type, participant.id)}
                          data-testid={`button-add-${type}-${participant.id}`}
                        >
                          <Icon className="h-3 w-3" />
                          {fieldTypeLabels[type]}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="space-y-1">
                {(Object.keys(fieldTypeIcons) as Array<keyof typeof fieldTypeIcons>).map((type) => {
                  const Icon = fieldTypeIcons[type];
                  return (
                    <Button
                      key={type}
                      size="sm"
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => addField(type, null)}
                      data-testid={`button-add-${type}`}
                    >
                      <Icon className="h-4 w-4" />
                      {fieldTypeLabels[type]}
                    </Button>
                  );
                })}
              </div>
            )}

            {fields.length > 0 && (
              <>
                <h3 className="text-sm font-medium mt-6 mb-3">Placed Fields</h3>
                <div className="space-y-2">
                  {fields.map((field) => {
                    const Icon = fieldTypeIcons[field.type];
                    const participant = participants.find((p) => p.id === field.participantId);
                    return (
                      <div
                        key={field.id}
                        className={`flex items-center justify-between p-2 rounded-md bg-card border cursor-pointer ${
                          selectedFieldId === field.id ? "ring-2 ring-primary" : ""
                        }`}
                        onClick={() => {
                          setSelectedFieldId(field.id);
                          setCurrentPage(field.page);
                        }}
                        data-testid={`field-item-${field.id}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getParticipantColor(field.participantId) }}
                          />
                          <Icon className="h-3 w-3 flex-shrink-0" />
                          <span className="text-xs truncate">
                            {fieldTypeLabels[field.type]} (P{field.page})
                          </span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeField(field.id);
                          }}
                          data-testid={`button-remove-field-${field.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        <div
          ref={containerRef}
          className="flex-1 overflow-auto p-4 bg-muted/50"
          onClick={() => setSelectedFieldId(null)}
        >
          <div className="relative inline-block">
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center justify-center h-[600px]">
                  <div className="animate-pulse text-muted-foreground">Loading PDF...</div>
                </div>
              }
              error={
                <div className="flex items-center justify-center h-[600px] text-destructive">
                  Failed to load PDF
                </div>
              }
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                width={containerWidth > 0 ? Math.min(containerWidth, 800) : undefined}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>

            {currentPageFields.map((field) => {
              const Icon = fieldTypeIcons[field.type];
              const isSelected = selectedFieldId === field.id;
              const color = getParticipantColor(field.participantId);

              return (
                <div
                  key={field.id}
                  className={`absolute cursor-move flex items-center justify-center border-2 rounded ${
                    isSelected ? "ring-2 ring-offset-2 ring-primary" : ""
                  }`}
                  style={{
                    left: field.x * scale,
                    top: field.y * scale,
                    width: field.width * scale,
                    height: field.height * scale,
                    borderColor: color,
                    backgroundColor: `${color}20`,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, field.id)}
                  data-testid={`placed-field-${field.id}`}
                >
                  <Icon className="h-4 w-4" style={{ color }} />

                  {!readOnly && isSelected && (
                    <div
                      className="absolute bottom-0 right-0 w-3 h-3 bg-primary cursor-se-resize rounded-tl"
                      onMouseDown={(e) => handleResizeMouseDown(e, field.id)}
                      data-testid={`resize-handle-${field.id}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
