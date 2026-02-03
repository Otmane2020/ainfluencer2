import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SourceImageUploadProps {
  onImageSelect: (imageData: string | null) => void;
  disabled?: boolean;
}

export const SourceImageUpload = ({
  onImageSelect,
  disabled = false,
}: SourceImageUploadProps) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreview(result);
      onImageSelect(result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleRemove = () => {
    setPreview(null);
    onImageSelect(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  if (preview) {
    return (
      <div className="relative rounded-lg overflow-hidden border border-border bg-muted/30">
        <img
          src={preview}
          alt="Source image"
          className="w-full h-32 object-cover"
        />
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7"
          onClick={handleRemove}
          disabled={disabled}
        >
          <X className="h-4 w-4" />
        </Button>
        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded px-2 py-1">
          <span className="text-xs text-white">Source image</span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        relative border-2 border-dashed rounded-lg p-6
        flex flex-col items-center justify-center gap-2
        cursor-pointer transition-all
        ${isDragOver 
          ? "border-primary bg-primary/5" 
          : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
      />
      
      <div className="rounded-full bg-primary/10 p-3">
        <ImageIcon className="h-6 w-6 text-primary" />
      </div>
      
      <div className="text-center">
        <p className="text-sm font-medium">Upload source image</p>
        <p className="text-xs text-muted-foreground mt-1">
          Drag & drop or click to browse
        </p>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <Upload className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          PNG, JPG, WEBP up to 10MB
        </span>
      </div>
    </div>
  );
};

export default SourceImageUpload;
