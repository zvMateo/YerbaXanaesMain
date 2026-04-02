"use client";

import { useState } from "react";
import { X, TrendingUp, TrendingDown } from "lucide-react";
import { useAdjustStock, type InventoryItem } from "@/hooks/use-inventory";

interface AdjustStockModalProps {
  open: boolean;
  onClose: () => void;
  item: InventoryItem | null;
}

export function AdjustStockModal({
  open,
  onClose,
  item,
}: AdjustStockModalProps) {
  const adjustStock = useAdjustStock();
  const [mode, setMode] = useState<"add" | "subtract">("add");
  const [quantity, setQuantity] = useState("");

  if (!open || !item) return null;

  const unitLabel = item.unit === "GRAMS" ? "gramos" : "unidades";
  const displayStock =
    item.unit === "GRAMS"
      ? `${(item.currentStock / 1000).toFixed(2)} kg`
      : `${item.currentStock} u`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(quantity);
    if (!qty || qty <= 0) return;

    const quantityChange = mode === "add" ? qty : -qty;
    adjustStock.mutate(
      { id: item.id, quantityChange },
      {
        onSuccess: () => {
          setQuantity("");
          onClose();
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">
              Ajustar Stock
            </h2>
            <p className="text-sm text-stone-500 mt-0.5">{item.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Stock actual */}
          <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
            <span className="text-sm text-stone-600">Stock actual</span>
            <span className="font-semibold text-stone-900">{displayStock}</span>
          </div>

          {/* Modo: sumar o restar */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("add")}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                mode === "add"
                  ? "bg-green-100 text-green-700 ring-2 ring-green-400"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              Agregar
            </button>
            <button
              type="button"
              onClick={() => setMode("subtract")}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                mode === "subtract"
                  ? "bg-red-100 text-red-700 ring-2 ring-red-400"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              <TrendingDown className="h-4 w-4" />
              Reducir
            </button>
          </div>

          {/* Cantidad */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Cantidad ({unitLabel})
            </label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-yerba-500 focus:border-transparent text-lg font-semibold"
              placeholder="0"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-stone-200 text-stone-700 rounded-xl hover:bg-stone-50 transition-colors text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={adjustStock.isPending || !quantity}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                mode === "add"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {adjustStock.isPending
                ? "Guardando..."
                : mode === "add"
                  ? "Agregar stock"
                  : "Reducir stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
