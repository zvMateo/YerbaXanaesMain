"use client";

import { useState, useCallback } from "react";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import {
  useUploadProductImage,
  useRemoveProductImage,
} from "@/hooks/use-products";
import Image from "next/image";

interface ImageUploaderProps {
  productId: string;
  images: string[];
}

export function ImageUploader({ productId, images }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<number>(0);
  const uploadMutation = useUploadProductImage();
  const removeMutation = useRemoveProductImage();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      void handleFiles(files);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [productId, images],
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    void handleFiles(files);
    e.target.value = ""; // reset
  };

  const handleFiles = async (files: File[]) => {
    const validFiles = files.filter((f) => {
      const isTypeValid = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/heif",
      ].includes(f.type);
      const isExtValid =
        f.name.toLowerCase().endsWith(".heic") ||
        f.name.toLowerCase().endsWith(".heif");
      return isTypeValid || isExtValid;
    });

    if (validFiles.length !== files.length) {
      toast.error(
        "Algunos archivos no son imágenes válidas (JPG, PNG, WebP, HEIC)",
      );
    }

    if (images.length + validFiles.length > 5) {
      toast.error("El límite máximo es de 5 imágenes por producto");
      return;
    }

    setUploadingFiles(validFiles.length);

    for (const file of validFiles) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`La imagen ${file.name} supera los 5MB`);
        setUploadingFiles((prev) => prev - 1);
        continue;
      }

      try {
        await uploadMutation.mutateAsync({ productId, file });
      } catch (error) {
        console.error(error);
        toast.error(`Error subiendo ${file.name}`);
      } finally {
        setUploadingFiles((prev) => prev - 1);
      }
    }
  };

  const handleRemove = async (url: string) => {
    if (confirm("¿Estás seguro de eliminar esta imagen?")) {
      try {
        await removeMutation.mutateAsync({ productId, url });
        toast.success("Imagen eliminada");
      } catch (error) {
        console.error(error);
        toast.error("Error eliminando imagen");
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Imágenes del Producto</h3>
        <span className="text-sm text-stone-500">{images.length}/5</span>
      </div>

      {/* Grid de imágenes actuales */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {images.map((url, index) => (
            <div
              key={index}
              className="group relative aspect-square rounded-lg border bg-stone-100 overflow-hidden"
            >
              <img
                src={url}
                alt={`Imagen ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                disabled={removeMutation.isPending}
                onClick={() => handleRemove(url)}
                className="absolute top-2 right-2 p-1.5 bg-white/90 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white disabled:opacity-50"
              >
                {removeMutation.isPending &&
                removeMutation.variables?.url === url ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
          {/* Skeleton para uploads en curso */}
          {Array.from({ length: uploadingFiles }).map((_, i) => (
            <div
              key={`uploading-${i}`}
              className="aspect-square rounded-lg border bg-stone-100 flex items-center justify-center"
            >
              <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
            </div>
          ))}
        </div>
      )}

      {/* Dropzone */}
      {images.length + uploadingFiles < 5 && (
        <label
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative flex flex-col items-center justify-center w-full p-8 
            border-2 border-dashed rounded-xl cursor-pointer transition-colors
            ${
              isDragging
                ? "border-green-500 bg-green-50"
                : "border-stone-300 hover:border-stone-400 hover:bg-stone-50"
            }
          `}
        >
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="p-3 bg-white border shadow-sm rounded-full">
              <Upload className="w-6 h-6 text-stone-500" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Hacé click para subir o arrastrá
              </p>
              <p className="text-xs text-stone-500">
                JPG, PNG, WebP o HEIC (Max. 5MB)
              </p>
            </div>
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            multiple
            onChange={handleFileInput}
          />
        </label>
      )}
    </div>
  );
}
