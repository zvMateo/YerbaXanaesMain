"use client";

import { useState } from "react";
import {
  Plus,
  Tag,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Loader2,
  X,
  Check,
} from "lucide-react";
import {
  useCoupons,
  useCreateCoupon,
  useToggleCoupon,
  useDeleteCoupon,
  type CreateCouponDto,
} from "@/hooks/use-coupons";
import { Sidebar, QuickActions } from "@/components/sidebar";

export default function CuponesPage() {
  const { data: coupons = [], isLoading } = useCoupons();
  const createCoupon = useCreateCoupon();
  const toggleCoupon = useToggleCoupon();
  const deleteCoupon = useDeleteCoupon();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateCouponDto>({
    code: "",
    discountType: "PERCENTAGE",
    discountValue: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCoupon.mutate(form, {
      onSuccess: () => {
        setShowForm(false);
        setForm({ code: "", discountType: "PERCENTAGE", discountValue: 0 });
      },
    });
  };

  const handleDelete = (id: string, code: string) => {
    if (confirm(`¿Eliminar el cupón "${code}"?`)) {
      deleteCoupon.mutate(id);
    }
  };

  return (
    <div className="flex min-h-screen bg-stone-50/50">
      <Sidebar />
      <main className="flex-1 lg:ml-0 overflow-auto">
        <div className="bg-white border-b border-stone-200 px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-stone-900 font-medium">Cupones</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <div>
              <h1 className="text-2xl font-bold text-stone-900">Cupones</h1>
              <p className="text-stone-500 text-sm">
                Gestión de descuentos y promociones
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-yerba-600 text-white rounded-xl hover:bg-yerba-700 transition-colors font-medium text-sm shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Nuevo cupón
            </button>
          </div>
        </div>

        <div className="p-6 lg:p-8 space-y-6">
          {/* Create form */}
          {showForm && (
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-stone-900">Nuevo cupón</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-1 hover:bg-stone-100 rounded-lg"
                >
                  <X className="h-5 w-5 text-stone-500" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Código *
                  </label>
                  <input
                    value={form.code}
                    onChange={(e) =>
                      setForm({ ...form, code: e.target.value.toUpperCase() })
                    }
                    placeholder="Ej: YERBA20"
                    required
                    className="w-full px-3 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-yerba-500 focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Tipo *
                  </label>
                  <select
                    value={form.discountType}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        discountType: e.target.value as "PERCENTAGE" | "FIXED",
                      })
                    }
                    className="w-full px-3 py-2.5 border border-stone-200 rounded-xl bg-white focus:ring-2 focus:ring-yerba-500 focus:outline-none text-sm"
                  >
                    <option value="PERCENTAGE">Porcentaje (%)</option>
                    <option value="FIXED">Monto fijo ($)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Valor *
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.discountValue || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        discountValue: Number(e.target.value),
                      })
                    }
                    placeholder={
                      form.discountType === "PERCENTAGE" ? "Ej: 20" : "Ej: 1500"
                    }
                    required
                    className="w-full px-3 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-yerba-500 focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Monto mínimo ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.minOrderAmount || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        minOrderAmount: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder="Sin mínimo"
                    className="w-full px-3 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-yerba-500 focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Usos máximos
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.maxUses || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        maxUses: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder="Ilimitado"
                    className="w-full px-3 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-yerba-500 focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Vencimiento
                  </label>
                  <input
                    type="date"
                    value={form.expiresAt || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        expiresAt: e.target.value || undefined,
                      })
                    }
                    className="w-full px-3 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-yerba-500 focus:outline-none text-sm"
                  />
                </div>

                <div className="col-span-2 flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-4 py-2.5 border border-stone-200 text-stone-700 rounded-xl hover:bg-stone-50 transition-colors font-medium text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createCoupon.isPending}
                    className="flex-1 px-4 py-2.5 bg-yerba-600 text-white rounded-xl hover:bg-yerba-700 transition-colors font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {createCoupon.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Crear cupón
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-6 w-6 animate-spin text-yerba-600" />
              </div>
            ) : coupons.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-stone-400">
                <Tag className="h-10 w-10 mb-3 text-stone-300" />
                <p className="font-medium">No hay cupones</p>
                <p className="text-sm">
                  Creá el primero con el botón de arriba
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      Código
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      Descuento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      Usos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      Vencimiento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {coupons.map((coupon) => (
                    <tr
                      key={coupon.id}
                      className="hover:bg-stone-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono font-semibold text-stone-900 bg-stone-100 px-2 py-1 rounded-lg text-xs">
                          {coupon.code}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-stone-700">
                        {coupon.discountType === "PERCENTAGE"
                          ? `${coupon.discountValue}%`
                          : `$${Number(coupon.discountValue).toLocaleString("es-AR")}`}
                        {coupon.minOrderAmount && (
                          <span className="text-xs text-stone-400 ml-1">
                            (mín. $
                            {Number(coupon.minOrderAmount).toLocaleString(
                              "es-AR",
                            )}
                            )
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-stone-700">
                        {coupon.currentUses}
                        {coupon.maxUses ? ` / ${coupon.maxUses}` : " / ∞"}
                      </td>
                      <td className="px-6 py-4 text-stone-500 text-xs">
                        {coupon.expiresAt
                          ? new Date(coupon.expiresAt).toLocaleDateString(
                              "es-AR",
                            )
                          : "Sin vencimiento"}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleCoupon.mutate(coupon.id)}
                          className="flex items-center gap-1.5 text-xs font-medium"
                        >
                          {coupon.isActive ? (
                            <>
                              <ToggleRight className="h-4 w-4 text-yerba-600" />
                              <span className="text-yerba-600">Activo</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="h-4 w-4 text-stone-400" />
                              <span className="text-stone-400">Inactivo</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(coupon.id, coupon.code)}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
      <QuickActions />
    </div>
  );
}
