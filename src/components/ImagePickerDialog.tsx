import { useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog';
import { Button } from '@/components/shadcn/button';
import { Spinner } from '@/components/shadcn/spinner';
import {
  fetchImageBytes,
  listImages,
  uploadImage,
  type DriveImageMeta,
} from '@/services/google-drive';

interface ImagePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (path: string) => void;
}

export function ImagePickerDialog({ open, onOpenChange, onSelect }: ImagePickerDialogProps) {
  const [images, setImages] = useState<DriveImageMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    listImages()
      .then((list) => {
        if (cancelled) return;
        setImages(list);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handlePick = (img: DriveImageMeta) => {
    onSelect(`/drive/${img.id}.${extensionFor(img)}`);
    onOpenChange(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const meta = await uploadImage(file, file.name);
      setImages((prev) => [...prev, meta].sort((a, b) => a.name.localeCompare(b.name)));
      handlePick(meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  };

  const handleUrlInsert = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    if (!/^https?:\/\//i.test(trimmed)) {
      setError('URL must start with http:// or https://');
      return;
    }
    onSelect(trimmed);
    setUrl('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Insert image</DialogTitle>
          <DialogDescription>
            Pick an image from your Drive library, upload a new one, or insert a URL.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="min-h-[200px] max-h-[360px] overflow-y-auto custom-scrollbar rounded border border-outline-variant/30 p-2">
            {loading ? (
              <div className="flex h-[200px] items-center justify-center">
                <Spinner />
              </div>
            ) : images.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-on-surface-variant">
                No images yet — upload one to get started.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {images.map((img) => (
                  <ImageTile key={img.id} image={img} onClick={() => handlePick(img)} />
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleUrlInsert} className="flex items-center gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Or paste an image URL (https://...)"
              className="flex-1 bg-surface-container-high text-on-surface text-sm font-body px-3 py-2 rounded-sm border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button type="submit" variant="outline" disabled={!url.trim()}>
              Insert URL
            </Button>
          </form>

          {error && <div className="text-xs text-destructive">{error}</div>}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="size-4" />
            {uploading ? 'Uploading…' : 'Upload new'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <DialogClose render={<Button variant="ghost">Cancel</Button>} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImageTile({ image, onClick }: { image: DriveImageMeta; onClick: () => void }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let blobUrl: string | null = null;
    fetchImageBytes(image.id)
      .then(({ bytes, mimeType }) => {
        if (cancelled) return;
        const blob = new Blob([bytes as BlobPart], { type: mimeType });
        blobUrl = URL.createObjectURL(blob);
        setSrc(blobUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [image.id]);

  return (
    <button
      type="button"
      onClick={onClick}
      title={image.name}
      className="group flex flex-col gap-1 rounded border border-outline-variant/30 p-1 hover:border-primary hover:bg-surface-container-high transition-colors text-left"
    >
      <div className="aspect-square w-full bg-surface-container rounded-sm overflow-hidden flex items-center justify-center">
        {src ? (
          <img src={src} alt={image.name} className="max-h-full max-w-full object-contain" />
        ) : failed ? (
          <span className="text-[10px] text-destructive">failed</span>
        ) : (
          <Spinner />
        )}
      </div>
      <div className="text-xs text-on-surface-variant truncate">{image.name}</div>
    </button>
  );
}

function extensionFor(img: DriveImageMeta): string {
  const dot = img.name.lastIndexOf('.');
  if (dot > 0 && dot < img.name.length - 1) {
    return img.name.slice(dot + 1).toLowerCase();
  }
  switch (img.mimeType) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    case 'image/svg+xml':
      return 'svg';
    default:
      return 'png';
  }
}
