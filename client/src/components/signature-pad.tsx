import { useState, useRef, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eraser, Check, Pencil, Type } from "lucide-react";

interface SignaturePadProps {
  onSignatureComplete: (signatureData: string, signatureType: 'drawn' | 'typed') => void;
  signerName?: string;
  disabled?: boolean;
}

const signatureFonts = [
  { name: "Elegant", fontFamily: "'Dancing Script', cursive" },
  { name: "Classic", fontFamily: "'Great Vibes', cursive" },
  { name: "Modern", fontFamily: "'Pacifico', cursive" },
  { name: "Professional", fontFamily: "'Allura', cursive" },
];

export default function SignaturePad({ onSignatureComplete, signerName = "", disabled = false }: SignaturePadProps) {
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  const typedCanvasRef = useRef<HTMLCanvasElement>(null);
  const [typedName, setTypedName] = useState(signerName);
  const [selectedFont, setSelectedFont] = useState(0);
  const [activeTab, setActiveTab] = useState<string>("draw");
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);

  const clearDrawnSignature = () => {
    sigCanvasRef.current?.clear();
    setHasDrawnSignature(false);
  };

  const handleDrawEnd = () => {
    setHasDrawnSignature(!sigCanvasRef.current?.isEmpty());
  };

  const generateTypedSignature = (): string => {
    const canvas = typedCanvasRef.current;
    if (!canvas || !typedName.trim()) return "";

    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000000";
    ctx.font = `48px ${signatureFonts[selectedFont].fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);

    return canvas.toDataURL("image/png");
  };

  const handleSubmit = () => {
    if (disabled) return;
    
    if (activeTab === "draw") {
      if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
        const signatureData = sigCanvasRef.current.toDataURL("image/png");
        onSignatureComplete(signatureData, "drawn");
      }
    } else {
      const signatureData = generateTypedSignature();
      if (signatureData) {
        onSignatureComplete(signatureData, "typed");
      }
    }
  };

  const canSubmit = activeTab === "draw" ? hasDrawnSignature : typedName.trim().length > 0;

  useEffect(() => {
    const loadFonts = async () => {
      await document.fonts.load("48px 'Dancing Script'");
      await document.fonts.load("48px 'Great Vibes'");
      await document.fonts.load("48px 'Pacifico'");
      await document.fonts.load("48px 'Allura'");
    };
    loadFonts();
  }, []);

  return (
    <div className="w-full space-y-4">
      <link
        href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Great+Vibes&family=Pacifico&family=Allura&display=swap"
        rel="stylesheet"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="draw" className="gap-2" data-testid="tab-draw-signature">
            <Pencil className="h-4 w-4" />
            Draw
          </TabsTrigger>
          <TabsTrigger value="type" className="gap-2" data-testid="tab-type-signature">
            <Type className="h-4 w-4" />
            Type
          </TabsTrigger>
        </TabsList>

        <TabsContent value="draw" className="space-y-4">
          <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg bg-white relative">
            <SignatureCanvas
              ref={sigCanvasRef}
              canvasProps={{
                className: "w-full h-48 rounded-lg",
                style: { width: "100%", height: "192px" },
              }}
              backgroundColor="white"
              penColor="black"
              onEnd={handleDrawEnd}
            />
            <div className="absolute bottom-8 left-4 right-4 border-t border-muted-foreground/30" />
            <p className="absolute bottom-2 left-4 text-xs text-muted-foreground">
              Sign above the line
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearDrawnSignature}
            className="gap-2"
            data-testid="button-clear-signature"
          >
            <Eraser className="h-4 w-4" />
            Clear
          </Button>
        </TabsContent>

        <TabsContent value="type" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="typed-name">Your Full Name</Label>
            <Input
              id="typed-name"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder="Type your full legal name"
              data-testid="input-typed-signature-name"
            />
          </div>

          <div className="space-y-2">
            <Label>Select Signature Style</Label>
            <div className="grid grid-cols-2 gap-2">
              {signatureFonts.map((font, index) => (
                <button
                  key={font.name}
                  type="button"
                  onClick={() => setSelectedFont(index)}
                  className={`p-4 rounded-lg border-2 transition-all hover-elevate ${
                    selectedFont === index
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/50"
                  }`}
                  data-testid={`button-font-${font.name.toLowerCase()}`}
                >
                  <span
                    style={{ fontFamily: font.fontFamily, fontSize: "24px" }}
                    className="block truncate text-foreground"
                  >
                    {typedName || "Your Name"}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1 block">
                    {font.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg bg-white p-4">
            <div className="h-24 flex items-center justify-center border-b border-muted-foreground/30 relative">
              <span
                style={{
                  fontFamily: signatureFonts[selectedFont].fontFamily,
                  fontSize: "48px",
                }}
                className="text-black"
              >
                {typedName || "Your Signature"}
              </span>
            </div>
            <p className="text-center text-xs text-muted-foreground mt-2">
              Signature Preview
            </p>
          </div>

          <canvas
            ref={typedCanvasRef}
            width={400}
            height={100}
            className="hidden"
          />
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-4 border-t">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || disabled}
          className="gap-2"
          data-testid="button-apply-signature"
        >
          <Check className="h-4 w-4" />
          Apply Signature
        </Button>
      </div>
    </div>
  );
}