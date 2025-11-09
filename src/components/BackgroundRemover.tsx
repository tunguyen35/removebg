import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Upload, Eraser, Circle, ZoomIn, ZoomOut, Download, Undo, RefreshCw, Eye } from "lucide-react";
import { toast } from "sonner";

type Mode = "erase" | "keep";
type BgColor = "transparent" | "white" | "red" | "blue" | "green" | "yellow" | "black";

const BackgroundRemover = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [mode, setMode] = useState<Mode>("erase");
  const [brushSize, setBrushSize] = useState(20);
  const [zoom, setZoom] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [bgColor, setBgColor] = useState<BgColor>("transparent");
  const [hasPreview, setHasPreview] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [showCursor, setShowCursor] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        initializeCanvas(img);
        toast.success("Ảnh đã được tải lên thành công!");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const initializeCanvas = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = img.width;
    canvas.height = img.height;
    
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(img, 0, 0);
    saveHistory();
  };

  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory(prev => [...prev, imageData]);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      saveHistory();
    }
    setIsDrawing(false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing && e.type !== "mousedown") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    if (mode === "erase") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalCompositeOperation = "destination-in";
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.putImageData(imageData, 0, 0);
      ctx.restore();
      ctx.globalCompositeOperation = "source-over";
    }
  };

  const undo = () => {
    if (history.length <= 1) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    
    const newHistory = [...history];
    newHistory.pop();
    const previousState = newHistory[newHistory.length - 1];
    
    ctx.putImageData(previousState, 0, 0);
    setHistory(newHistory);
    toast.success("Đã hoàn tác");
  };

  const clearCanvas = () => {
    if (!image) return;
    initializeCanvas(image);
    toast.success("Đã làm mới canvas");
  };

  const updatePreview = () => {
    const canvas = canvasRef.current;
    const previewCanvas = previewCanvasRef.current;
    if (!canvas || !previewCanvas) return;

    previewCanvas.width = canvas.width;
    previewCanvas.height = canvas.height;

    const ctx = previewCanvas.getContext("2d");
    if (!ctx) return;

    // Draw background
    if (bgColor !== "transparent") {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
    }

    // Draw the edited image
    ctx.drawImage(canvas, 0, 0);
    setHasPreview(true);
    toast.success("Đã cập nhật preview");
  };

  const downloadImage = (format: "png" | "jpg") => {
    const previewCanvas = previewCanvasRef.current;
    if (!previewCanvas || !hasPreview) {
      toast.error("Vui lòng cập nhật preview trước");
      return;
    }

    const link = document.createElement("a");
    link.download = `background-removed.${format}`;
    link.href = previewCanvas.toDataURL(`image/${format}`);
    link.click();
    toast.success(`Đã tải xuống ${format.toUpperCase()}`);
  };

  const zoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const zoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));

  return (
    <div className="min-h-screen bg-gradient-primary p-4 md:p-8">
      {/* Custom Cursor */}
      <div
        ref={cursorRef}
        className="pointer-events-none fixed z-50 rounded-full border-2 border-primary bg-primary/20 transition-all duration-75"
        style={{
          left: cursorPos.x,
          top: cursorPos.y,
          width: `${brushSize}px`,
          height: `${brushSize}px`,
          transform: "translate(-50%, -50%)",
          display: showCursor ? "block" : "none",
        }}
      />

      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 bg-gradient-to-r from-white to-white/80 bg-clip-text text-5xl font-bold text-transparent md:text-6xl">
            🎨 Xóa Phông Nền Ảnh
          </h1>
          <p className="text-lg text-white/90 md:text-xl">
            Vẽ tay để xóa phông - Chuyên nghiệp & Dễ dàng
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Edit Panel */}
          <Card className="overflow-hidden bg-white/95 p-6 shadow-glow backdrop-blur">
            <div className="mb-4 flex items-center justify-between border-b-2 border-primary pb-4">
              <h2 className="text-2xl font-bold text-foreground">🖌️ Chỉnh Sửa</h2>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-gradient-primary hover:opacity-90"
              >
                <Upload className="mr-2 h-4 w-4" />
                Chọn Ảnh
              </Button>
            </div>

            <div
              className="relative mb-4 flex min-h-[400px] items-center justify-center overflow-auto rounded-xl border-2 border-border bg-[linear-gradient(45deg,#f0f0f0_25%,transparent_25%),linear-gradient(-45deg,#f0f0f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f0f0f0_75%),linear-gradient(-45deg,transparent_75%,#f0f0f0_75%)] [background-position:0_0,0_10px,10px_-10px,-10px_0px] [background-size:20px_20px]"
              onMouseEnter={() => setShowCursor(true)}
              onMouseLeave={() => setShowCursor(false)}
            >
              {!image ? (
                <div className="text-center text-muted-foreground">
                  <div className="mb-4 text-6xl">📂</div>
                  <h3 className="mb-2 text-xl font-semibold">Chưa có ảnh</h3>
                  <p>Nhấn "Chọn Ảnh" ở trên để bắt đầu</p>
                </div>
              ) : (
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="cursor-none shadow-lg"
                  style={{ transform: `scale(${zoom})` }}
                />
              )}
            </div>

            {/* Controls */}
            <div className="space-y-4">
              {/* Mode Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={mode === "erase" ? "default" : "outline"}
                  onClick={() => setMode("erase")}
                  className={mode === "erase" ? "bg-gradient-primary" : ""}
                >
                  <Eraser className="mr-2 h-4 w-4" />
                  Xóa vùng vẽ
                </Button>
                <Button
                  variant={mode === "keep" ? "default" : "outline"}
                  onClick={() => setMode("keep")}
                  className={mode === "keep" ? "bg-gradient-primary" : ""}
                >
                  <Circle className="mr-2 h-4 w-4" />
                  Giữ vùng khoanh
                </Button>
              </div>

              {/* Brush Size & Zoom */}
              <div className="flex flex-col gap-4 rounded-lg bg-muted p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-semibold">Cỡ bút: {brushSize}px</label>
                  <Slider
                    value={[brushSize]}
                    onValueChange={(value) => setBrushSize(value[0])}
                    min={5}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="outline" onClick={zoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[60px] text-center font-semibold">{Math.round(zoom * 100)}%</span>
                  <Button size="icon" variant="outline" onClick={zoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Button
                  variant="outline"
                  onClick={undo}
                  disabled={history.length <= 1}
                >
                  <Undo className="mr-2 h-4 w-4" />
                  Quay lại
                </Button>
                <Button variant="outline" onClick={clearCanvas} disabled={!image}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Làm mới
                </Button>
                <Button
                  onClick={updatePreview}
                  disabled={!image}
                  className="bg-accent hover:bg-accent/90 sm:col-span-1"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Cập nhật Preview
                </Button>
              </div>
            </div>
          </Card>

          {/* Preview Panel */}
          <Card className="overflow-hidden bg-white/95 p-6 shadow-glow backdrop-blur">
            <div className="mb-4 border-b-2 border-primary pb-4">
              <h2 className="text-2xl font-bold text-foreground">👁️ Xem Trước Kết Quả</h2>
            </div>

            <div className="relative mb-4 flex min-h-[400px] items-center justify-center overflow-auto rounded-xl border-2 border-border bg-[linear-gradient(45deg,#f0f0f0_25%,transparent_25%),linear-gradient(-45deg,#f0f0f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f0f0f0_75%),linear-gradient(-45deg,transparent_75%,#f0f0f0_75%)] [background-position:0_0,0_10px,10px_-10px,-10px_0px] [background-size:20px_20px]">
              {!hasPreview ? (
                <div className="text-center text-muted-foreground">
                  <div className="mb-4 text-6xl">👈</div>
                  <h3 className="mb-2 text-xl font-semibold">Chưa có preview</h3>
                  <p>Vẽ xong bấm "Cập nhật Preview"</p>
                </div>
              ) : (
                <canvas ref={previewCanvasRef} className="shadow-lg" />
              )}
            </div>

            {/* Preview Options */}
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <label className="mb-2 block text-sm font-semibold">Màu nền:</label>
                <Select value={bgColor} onValueChange={(value: BgColor) => setBgColor(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transparent">Trong suốt</SelectItem>
                    <SelectItem value="white">Trắng</SelectItem>
                    <SelectItem value="red">Đỏ</SelectItem>
                    <SelectItem value="blue">Xanh dương</SelectItem>
                    <SelectItem value="green">Xanh lá</SelectItem>
                    <SelectItem value="yellow">Vàng</SelectItem>
                    <SelectItem value="black">Đen</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => downloadImage("png")}
                  disabled={!hasPreview}
                  className="bg-gradient-success hover:opacity-90"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Tải PNG
                </Button>
                <Button
                  onClick={() => downloadImage("jpg")}
                  disabled={!hasPreview}
                  className="bg-gradient-success hover:opacity-90"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Tải JPG
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BackgroundRemover;
