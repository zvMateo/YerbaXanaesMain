"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { AlertTriangle, X } from "lucide-react";
import { useMounted } from "@/hooks/use-mounted";

interface ConfirmDialogProps {
  title: string;
  /** Qué va a pasar, en concreto: a quién afecta, por cuánto, qué se revierte. */
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** `danger` para lo que destruye o mueve plata; `neutral` para el resto. */
  tone?: "danger" | "neutral";
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmación para acciones que no se pueden deshacer con un clic.
 *
 * Va en un portal porque se abre desde celdas de tabla y desde el drawer de
 * pedido, que crean su propio contexto de apilado. El z-index queda por encima
 * del drawer (z-80) y del modal de historial (z-90).
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "Volver",
  tone = "danger",
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const mounted = useMounted();
  const danger = tone === "danger";
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) {
        onCancel();
        return;
      }
      if (event.key !== "Tab") return;

      // El foco no puede salir del diálogo: detrás quedan checkboxes y botones
      // de la tabla, y este diálogo es la única barrera ante algo que no se
      // deshace.
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        "button:not([disabled]):not([tabindex='-1'])",
      );
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      const inside = active instanceof Node && panel.contains(active);

      if (event.shiftKey && (!inside || active === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || active === last)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isPending, onCancel]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      {/* Fondo clickeable. aria-hidden + tabIndex -1: el lector de pantalla ya
          tiene el botón de cerrar del encabezado, este sería un duplicado. */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={() => !isPending && onCancel()}
        className="absolute inset-0 cursor-default"
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        className="relative w-full max-w-md rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 p-6 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                danger ? "bg-red-100" : "bg-amber-100"
              }`}
            >
              <AlertTriangle
                className={`h-5 w-5 ${danger ? "text-red-600" : "text-amber-600"}`}
              />
            </div>
            <h2
              id="confirm-dialog-title"
              className="text-base font-semibold text-stone-900"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            aria-label="Cerrar"
            className="rounded-lg p-1 text-stone-400 transition-colors hover:bg-stone-100 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 pb-6">
          <p
            id="confirm-dialog-description"
            className="text-sm text-stone-600"
          >
            {description}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              autoFocus
              onClick={onCancel}
              disabled={isPending}
              className="min-h-11 flex-1 rounded-xl border border-stone-200 py-2.5 font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              data-testid="confirm-dialog-confirm"
              onClick={onConfirm}
              disabled={isPending}
              className={`min-h-11 flex-1 rounded-xl py-2.5 font-medium text-white transition-colors disabled:opacity-50 ${
                danger
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-stone-800 hover:bg-stone-900"
              }`}
            >
              {isPending ? "Procesando..." : confirmLabel}
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
