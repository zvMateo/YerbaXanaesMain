"use client";

import { useState } from "react";
import {
  usePaymentLinks,
  useCreatePaymentLink,
  useDeactivatePaymentLink,
  type PaymentLink,
} from "@/hooks/use-payment-links";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Link as LinkIcon,
  Copy,
  MoreVertical,
  Plus,
  Trash2,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

// UI Components (suponiendo que tenés un Dialog wrapper o uso html nativo con estilos shadcn)
// Para simplificar y no depender de componentes complejos de shadcn que quizas no tengas instalados
// voy a usar un modal custom simple con Tailwind + Framer Motion.

export function PaymentLinksManager() {
  const { data: links, isLoading } = usePaymentLinks();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">
            Tus Links de Pago
          </h2>
          <p className="text-sm text-stone-500">
            Generá links para cobrar por WhatsApp o Instagram
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-yerba-600 text-white rounded-xl hover:bg-yerba-700 transition-colors font-medium shadow-sm hover:shadow-md"
        >
          <Plus className="w-5 h-5" />
          Nuevo Link
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-stone-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : links?.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 border-dashed">
          <div className="w-16 h-16 bg-yerba-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <LinkIcon className="w-8 h-8 text-yerba-600" />
          </div>
          <h3 className="text-lg font-medium text-stone-900">
            No tenés links activos
          </h3>
          <p className="text-stone-500 mt-1 mb-6">
            Empezá a vender creando tu primer link de pago.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="text-yerba-600 font-medium hover:underline"
          >
            Crear ahora
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {links?.map((link) => (
            <PaymentLinkCard key={link.id} link={link} />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {isCreateOpen && (
          <CreateLinkModal onClose={() => setIsCreateOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function PaymentLinkCard({ link }: { link: PaymentLink }) {
  const deactivate = useDeactivatePaymentLink();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(link.initPoint);
    toast.success("Link copiado al portapapeles");
  };

  const shareOnWhatsApp = () => {
    const text = `Hola! Acá te dejo el link de pago para ${link.title}: ${link.initPoint}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white p-4 rounded-xl border transition-all hover:shadow-md ${
        link.status === "ACTIVE"
          ? "border-stone-200"
          : "border-stone-100 opacity-75"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-stone-900 truncate">
              {link.title}
            </h3>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                link.status === "ACTIVE"
                  ? "bg-green-100 text-green-700"
                  : "bg-stone-100 text-stone-500"
              }`}
            >
              {link.status === "ACTIVE" ? "ACTIVO" : "INACTIVO"}
            </span>
          </div>
          <p className="text-2xl font-bold text-stone-900">
            ${link.unitPrice.toLocaleString("es-AR")}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-stone-500">
            <span>
              {format(new Date(link.createdAt), "d MMM yyyy", { locale: es })}
            </span>
            <span>•</span>
            <span>{link.quantity} u.</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={copyToClipboard}
            className="p-2 text-stone-500 hover:text-yerba-600 hover:bg-yerba-50 rounded-lg transition-colors"
            title="Copiar Link"
          >
            <Copy className="w-5 h-5" />
          </button>
          <button
            onClick={shareOnWhatsApp}
            className="p-2 text-stone-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Enviar por WhatsApp"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          {link.status === "ACTIVE" && (
            <button
              onClick={() => {
                if (confirm("¿Desactivar este link?"))
                  deactivate.mutate(link.id);
              }}
              className="p-2 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Desactivar"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function CreateLinkModal({ onClose }: { onClose: () => void }) {
  const create = useCreatePaymentLink();
  const [formData, setFormData] = useState({
    title: "",
    price: "",
    quantity: "1",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.price) return;

    await create.mutateAsync({
      title: formData.title,
      unit_price: Number(formData.price),
      quantity: Number(formData.quantity),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6">
          <h3 className="text-xl font-bold text-stone-900 mb-4">
            Nuevo Link de Pago
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Título del producto/servicio
              </label>
              <input
                autoFocus
                type="text"
                placeholder="Ej: Promo Yerba + Mate"
                className="w-full px-4 py-2 border border-stone-200 rounded-xl focus:ring-2 focus:ring-yerba-500 outline-none"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Precio ($)
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-stone-200 rounded-xl focus:ring-2 focus:ring-yerba-500 outline-none"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  required
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Cantidad
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-stone-200 rounded-xl focus:ring-2 focus:ring-yerba-500 outline-none"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: e.target.value })
                  }
                  required
                  min="1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={create.isPending}
                className="px-6 py-2 bg-yerba-600 text-white rounded-xl hover:bg-yerba-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {create.isPending ? "Generando..." : "Crear Link"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
