"use client";

import { useState } from "react";
import { X, Loader2, Check, Package } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  useCreateInventoryItem,
  type MeasurementUnit,
} from "@/hooks/use-inventory";
import { toast } from "sonner";

interface CreateInventoryModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateInventoryModal({
  open,
  onClose,
}: CreateInventoryModalProps) {
  const createItem = useCreateInventoryItem();
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<MeasurementUnit>("GRAMS");
  const [stockRaw, setStockRaw] = useState("");
  const [minStockRaw, setMinStockRaw] = useState("");
  const [costRaw, setCostRaw] = useState("");

  const reset = () => {
    setName("");
    setUnit("GRAMS");
    setStockRaw("");
    setMinStockRaw("");
    setCostRaw("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    // Convertir stock según unidad
    const stockNum = parseFloat(stockRaw);
    if (isNaN(stockNum) || stockNum < 0) {
      toast.error("El stock debe ser un número válido");
      return;
    }
    const stockInUnit = unit === "GRAMS" ? stockNum * 1000 : stockNum;

    const minStock = minStockRaw ? parseFloat(minStockRaw) : null;
    const minStockInUnit =
      minStock !== null
        ? unit === "GRAMS"
          ? minStock * 1000
          : minStock
        : null;

    const cost = costRaw ? parseFloat(costRaw) : null;

    createItem.mutate(
      {
        name: name.trim(),
        unit,
        currentStock: stockInUnit,
        minStockAlert: minStockInUnit ?? undefined,
        costPrice: cost ?? undefined,
      },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
      },
    );
  };

  const isLoading = createItem.isPending;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-stone-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yerba-100 rounded-lg">
                  <Package className="h-5 w-5 text-yerba-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-stone-900">
                    Nuevo Insumo
                  </h2>
                  <p className="text-sm text-stone-500">
                    Materia prima para tus productos
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  reset();
                  onClose();
                }}
                className="p-1 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-stone-500" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Nombre del insumo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Yerba Entrefina x 10kg"
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-yerba-500 focus:border-transparent transition-all focus:outline-none"
                  autoFocus
                  required
                />
              </div>

              {/* Unidad */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Unidad de medida
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setUnit("GRAMS")}
                    className={`p-3 border-2 rounded-xl text-center transition-all ${
                      unit === "GRAMS"
                        ? "border-yerba-600 bg-yerba-50"
                        : "border-stone-200 hover:border-stone-300"
                    }`}
                  >
                    <p className="font-medium text-stone-900">Kilogramos</p>
                    <p className="text-xs text-stone-500">
                      Para yerba, hierbas...
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnit("UNITS")}
                    className={`p-3 border-2 rounded-xl text-center transition-all ${
                      unit === "UNITS"
                        ? "border-yerba-600 bg-yerba-50"
                        : "border-stone-200 hover:border-stone-300"
                    }`}
                  >
                    <p className="font-medium text-stone-900">Unidades</p>
                    <p className="text-xs text-stone-500">
                      Para mates, bombillas...
                    </p>
                  </button>
                </div>
              </div>

              {/* Stock inicial */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Stock inicial{" "}
                  <span className="text-stone-400 font-normal">
                    (en {unit === "GRAMS" ? "kg" : "unidades"})
                  </span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={stockRaw}
                  onChange={(e) => setStockRaw(e.target.value)}
                  placeholder={unit === "GRAMS" ? "Ej: 10 (10 kg)" : "Ej: 50"}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-yerba-500 focus:border-transparent transition-all focus:outline-none"
                  required
                />
              </div>

              {/* Alerta mínima + Costo en fila */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Alerta mínima{" "}
                    <span className="text-stone-400 font-normal">
                      (en {unit === "GRAMS" ? "kg" : "u"})
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={minStockRaw}
                    onChange={(e) => setMinStockRaw(e.target.value)}
                    placeholder={unit === "GRAMS" ? "Ej: 2" : "Ej: 5"}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-yerba-500 focus:border-transparent transition-all focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Costo unitario ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costRaw}
                    onChange={(e) => setCostRaw(e.target.value)}
                    placeholder="Ej: 5000"
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-yerba-500 focus:border-transparent transition-all focus:outline-none"
                  />
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    onClose();
                  }}
                  className="flex-1 px-4 py-2.5 border border-stone-200 text-stone-700 rounded-xl hover:bg-stone-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !name.trim() || !stockRaw}
                  className="flex-1 px-4 py-2.5 bg-yerba-600 text-white rounded-xl hover:bg-yerba-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Crear insumo
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
