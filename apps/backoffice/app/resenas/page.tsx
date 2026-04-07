"use client";

import { useState } from "react";
import { Star, Check, X, Trash2, Loader2, MessageSquare } from "lucide-react";
import {
  useRatings,
  useApproveRating,
  useRejectRating,
  useDeleteRating,
} from "@/hooks/use-ratings";

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${
            star <= rating ? "text-amber-400 fill-amber-400" : "text-stone-300"
          }`}
        />
      ))}
    </div>
  );
}

export default function ResenasPage() {
  const { data: ratings = [], isLoading } = useRatings();
  const approveRating = useApproveRating();
  const rejectRating = useRejectRating();
  const deleteRating = useDeleteRating();
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");

  const filtered = ratings.filter((r) => {
    if (filter === "pending") return !r.isApproved;
    if (filter === "approved") return r.isApproved;
    return true;
  });

  const pendingCount = ratings.filter((r) => !r.isApproved).length;

  const handleDelete = (id: string) => {
    if (confirm("¿Eliminar esta reseña?")) {
      deleteRating.mutate(id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Reseñas</h1>
          <p className="text-stone-500 text-sm mt-1">
            Moderación de reseñas de productos
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
            {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "pending", "approved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f
                ? "bg-yerba-600 text-white"
                : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
            }`}
          >
            {f === "all" ? "Todas" : f === "pending" ? "Pendientes" : "Aprobadas"}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-yerba-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-stone-200 text-stone-400">
            <MessageSquare className="h-10 w-10 mb-3 text-stone-300" />
            <p className="font-medium">No hay reseñas</p>
            <p className="text-sm">
              {filter === "pending" ? "No hay reseñas pendientes" : "Sin reseñas aún"}
            </p>
          </div>
        ) : (
          filtered.map((rating) => (
            <div
              key={rating.id}
              className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <StarDisplay rating={rating.rating} />
                    <span className="text-xs text-stone-400">
                      {new Date(rating.createdAt).toLocaleDateString("es-AR")}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        rating.isApproved
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {rating.isApproved ? "Aprobada" : "Pendiente"}
                    </span>
                  </div>

                  {rating.product && (
                    <p className="text-xs text-stone-500 mb-1">
                      Producto:{" "}
                      <span className="font-medium text-stone-700">
                        {rating.product.name}
                      </span>
                    </p>
                  )}

                  <p className="text-xs text-stone-500 mb-2">
                    Cliente:{" "}
                    <span className="font-medium text-stone-700">
                      {rating.user?.name || rating.user?.email || "Anónimo"}
                    </span>
                  </p>

                  {rating.comment && (
                    <p className="text-sm text-stone-700 bg-stone-50 rounded-xl p-3">
                      "{rating.comment}"
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {!rating.isApproved ? (
                    <button
                      onClick={() => approveRating.mutate(rating.id)}
                      disabled={approveRating.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Aprobar
                    </button>
                  ) : (
                    <button
                      onClick={() => rejectRating.mutate(rating.id)}
                      disabled={rejectRating.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 text-stone-600 hover:bg-stone-100 rounded-lg text-xs font-medium transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                      Desaprobar
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(rating.id)}
                    disabled={deleteRating.isPending}
                    className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
