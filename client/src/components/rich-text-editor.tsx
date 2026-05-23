import { useRef, useCallback, useEffect } from "react";
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
}

export function RichTextEditor({ value, onChange, placeholder = "Start writing...", className, minHeight = 200 }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isComposing = useRef(false);

  // Sync value into editor only on mount or external reset (not on every keystroke)
  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, []); // intentionally only on mount

  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const handleLink = useCallback(() => {
    const url = prompt("Enter URL:", "https://");
    if (url) exec("createLink", url);
  }, [exec]);

  const handleInput = useCallback(() => {
    if (!isComposing.current && editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const toolbarActions = [
    { icon: Bold, label: "Bold", action: () => exec("bold") },
    { icon: Italic, label: "Italic", action: () => exec("italic") },
    { icon: Heading2, label: "H2", action: () => exec("formatBlock", "<h2>") },
    { icon: Heading3, label: "H3", action: () => exec("formatBlock", "<h3>") },
    { icon: List, label: "Bullet list", action: () => exec("insertUnorderedList") },
    { icon: ListOrdered, label: "Numbered list", action: () => exec("insertOrderedList") },
    { icon: Link, label: "Link", action: handleLink },
  ];

  return (
    <div className={cn("border rounded-md overflow-hidden bg-background", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 p-1 border-b bg-muted/30">
        {toolbarActions.map(({ icon: Icon, label, action }) => (
          <Button
            key={label}
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title={label}
            onMouseDown={(e) => { e.preventDefault(); action(); }}
            data-testid={`rte-btn-${label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <Icon className="h-3.5 w-3.5" />
          </Button>
        ))}
      </div>
      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onCompositionStart={() => { isComposing.current = true; }}
        onCompositionEnd={() => {
          isComposing.current = false;
          if (editorRef.current) onChange(editorRef.current.innerHTML);
        }}
        data-placeholder={placeholder}
        style={{ minHeight }}
        className={cn(
          "p-3 text-sm focus:outline-none prose prose-sm dark:prose-invert max-w-none",
          "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground"
        )}
      />
    </div>
  );
}
