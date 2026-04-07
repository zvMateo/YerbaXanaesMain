"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";
import {
  useAddProductImage,
  useRemoveProductImage,
} from "@/hooks/use-products";

interface ImageUploaderProps {
  productId: string;
  images: string[];
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_MB = 5;

export function ImageUploader({ productId, images }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const addImage = useAddProductImage(productId);
  const removeImage = useRemoveProductImage(productId);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];

      if (!ACCEPTED_TYPES.includes(file.type)) {
        alert("Solo se permiten imágenes JPG, PNG o WebP");
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        alert(`La imagen no puede superar ${MAX_SIZE_MB}MB`);
        return;
      }

      addImage.mutate(file);
    },
    [addImage],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const isUploading = addImage.isPending;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-stone-700">
        Imágenes del producto
      </label>

      {/* Grid de imágenes existentes */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((url, idx) => (
            <div
              key={url}
              className="relative aspect-square rounded-xl overflow-hidden border border-stone-200 group"
            >
              <Image
                src={url}
                alt={`Imagen ${idx + 1}`}
                fill
                className="object-cover"
                sizes="120px"
              />
              <button
                type="button"
                onClick={() => removeImage.mutate(url)}
                disabled={removeImage.isPending}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50"
                title="Eliminar imagen"
              >
                <X className="h-3 w-3" />
              </button>
              {idx === 0 && (
                <span className="absolute bottom-1 left-1 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded-full">
                  principal
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Zona de drag & drop */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
          isDragging
            ? "border-yerba-500 bg-yerba-50"
            : "border-stone-200 hover:border-stone-300 bg-stone-50 hover:bg-stone-100"
        } ${isUploading ? "pointer-events-none opacity-60" : ""}`}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-7 w-7 text-yerba-600 animate-spin" />
            <p className="text-sm text-stone-600">Subiendo imagen...</p>
          </>
        ) : (
          <>
            {images.length === 0 ? (
              <ImageIcon className="h-7 w-7 text-stone-400" />
            ) : (
              <Upload className="h-7 w-7 text-stone-400" />
            )}
            <div className="text-center">
              <p className="text-sm font-medium text-stone-700">
                {images.length === 0
                  ? "Agregar imágenes"
                  : "Agregar otra imagen"}
              </p>
              <p className="text-xs text-stone-500">
                Arrastrá o hacé clic · JPG, PNG, WebP · Máx. 5MB
              </p>
            </div>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
