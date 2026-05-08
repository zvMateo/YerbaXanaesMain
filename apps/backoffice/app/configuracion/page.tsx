"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import {
  Store,
  Truck,
  CreditCard,
  Bell,
  Save,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Package,
  Info,
  Loader2,
} from "lucide-react";
import {
  useSettings,
  useUpdateSettings,
  type StoreSettings,
  type UpdateSettingsDto,
} from "@/hooks/use-settings";

// ============================================================
// TIPOS LOCALES
// ============================================================

type SettingsTab = "business" | "shipping" | "payments" | "notifications";

// ============================================================
// COMPONENTES DE SECCIÓN
// ============================================================

function BusinessSection({
  settings,
  onChange,
}: {
  settings: StoreSettings;
  onChange: (patch: UpdateSettingsDto) => void;
}) {
  const fields: {
    key: keyof UpdateSettingsDto;
    label: string;
    icon: React.ReactNode;
    type?: string;
    placeholder: string;
  }[] = [
    {
      key: "businessName",
      label: "Nombre del negocio",
      icon: <Store className="h-4 w-4" />,
      placeholder: "YerbaXanaes",
    },
    {
      key: "email",
      label: "Email de contacto",
      icon: <Mail className="h-4 w-4" />,
      type: "email",
      placeholder: "contacto@yerbaxanaes.com",
    },
    {
      key: "phone",
      label: "Teléfono",
      icon: <Phone className="h-4 w-4" />,
      type: "tel",
      placeholder: "+54 9 11 1234-5678",
    },
    {
      key: "address",
      label: "Dirección del local",
      icon: <MapPin className="h-4 w-4" />,
      placeholder: "Av. Principal 1234, Ciudad",
    },
    {
      key: "city",
      label: "Ciudad / Provincia",
      icon: <MapPin className="h-4 w-4" />,
      placeholder: "Buenos Aires, Argentina",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-yerba-100 rounded-lg">
          <Store className="h-5 w-5 text-yerba-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-stone-900">
            Datos del Negocio
          </h2>
          <p className="text-sm text-stone-500">
            Esta información aparece en tu tienda y en los comprobantes
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              {field.label}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                {field.icon}
              </span>
              <input
                type={field.type || "text"}
                value={
                  (settings[field.key as keyof StoreSettings] as string) || ""
                }
                onChange={(e) => onChange({ [field.key]: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 focus:border-yerba-500 focus:ring-2 focus:ring-yerba-100 transition-all focus:outline-none"
                placeholder={field.placeholder}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShippingSection({
  settings,
  onChange,
}: {
  settings: StoreSettings;
  onChange: (patch: UpdateSettingsDto) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Truck className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-stone-900">
            Configuración de Envíos
          </h2>
          <p className="text-sm text-stone-500">
            Tarifas y opciones de entrega para tus clientes
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl">
        <div className="flex items-center gap-3">
          <Truck className="h-5 w-5 text-stone-500" />
          <div>
            <p className="font-medium text-stone-900">
              Habilitar envío a domicilio
            </p>
            <p className="text-sm text-stone-500">
              Los clientes podrán elegir envío al checkout
            </p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.shippingEnabled}
            onChange={(e) => onChange({ shippingEnabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yerba-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yerba-600"></div>
        </label>
      </div>

      {settings.shippingEnabled && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              <DollarSign className="h-4 w-4 inline mr-1" />
              Tarifa plana de envío ($)
            </label>
            <input
              type="number"
              value={settings.shippingFlatRate}
              onChange={(e) =>
                onChange({ shippingFlatRate: Number(e.target.value) })
              }
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:border-yerba-500 focus:ring-2 focus:ring-yerba-100 transition-all focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              <Package className="h-4 w-4 inline mr-1" />
              Envío gratis a partir de ($)
            </label>
            <input
              type="number"
              value={settings.freeShippingThreshold}
              onChange={(e) =>
                onChange({ freeShippingThreshold: Number(e.target.value) })
              }
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:border-yerba-500 focus:ring-2 focus:ring-yerba-100 transition-all focus:outline-none"
            />
          </div>
        </div>
      )}

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-amber-800">
              Integración de correo pendiente
            </p>
            <p className="text-sm text-amber-700 mt-1">
              Actualmente se usa tarifa plana. Pronto se integrará Correo
              Argentino / OCA / Andreani para cálculo automático por código
              postal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentsSection({
  settings,
  onChange,
}: {
  settings: StoreSettings;
  onChange: (patch: UpdateSettingsDto) => void;
}) {
  const methods: {
    key: keyof UpdateSettingsDto;
    name: string;
    desc: string;
    color: string;
  }[] = [
    {
      key: "paymentMercadoPago",
      name: "MercadoPago",
      desc: "Tarjetas de crédito/débito, dinero en cuenta",
      color: "bg-blue-100 text-blue-600",
    },
    {
      key: "paymentCash",
      name: "Efectivo",
      desc: "Pago al recibir o retiro en local",
      color: "bg-green-100 text-green-600",
    },
    {
      key: "paymentTransfer",
      name: "Transferencia bancaria",
      desc: "CBU / Alias directo al banco",
      color: "bg-purple-100 text-purple-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-100 rounded-lg">
          <CreditCard className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-stone-900">
            Métodos de Pago
          </h2>
          <p className="text-sm text-stone-500">
            Activá o desactivá las formas de pago disponibles en el checkout
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {methods.map((method) => (
          <div
            key={method.key}
            className="flex items-center justify-between p-4 bg-stone-50 rounded-xl"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${method.color}`}>
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-stone-900">{method.name}</p>
                <p className="text-sm text-stone-500">{method.desc}</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings[method.key as keyof StoreSettings] as boolean}
                onChange={(e) => onChange({ [method.key]: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yerba-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yerba-600"></div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotificationsSection({
  settings,
  onChange,
}: {
  settings: StoreSettings;
  onChange: (patch: UpdateSettingsDto) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-100 rounded-lg">
          <Bell className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-stone-900">
            Notificaciones
          </h2>
          <p className="text-sm text-stone-500">
            Configurá las alertas para no perderte nada importante
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5">
          <Mail className="h-4 w-4 inline mr-1" />
          Email para alertas de nuevos pedidos
        </label>
        <input
          type="email"
          value={settings.notificationEmail}
          onChange={(e) => onChange({ notificationEmail: e.target.value })}
          className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:border-yerba-500 focus:ring-2 focus:ring-yerba-100 transition-all focus:outline-none"
          placeholder="tu-email@ejemplo.com"
        />
      </div>

      <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl">
        <div>
          <p className="font-medium text-stone-900">Alerta de stock bajo</p>
          <p className="text-sm text-stone-500">
            Notificar cuando un producto tenga poco stock
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.lowStockAlert}
            onChange={(e) => onChange({ lowStockAlert: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yerba-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yerba-600"></div>
        </label>
      </div>

      {settings.lowStockAlert && (
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            Umbral de stock bajo (unidades)
          </label>
          <input
            type="number"
            value={settings.lowStockThreshold}
            onChange={(e) =>
              onChange({ lowStockThreshold: Number(e.target.value) })
            }
            className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:border-yerba-500 focus:ring-2 focus:ring-yerba-100 transition-all focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}

// ============================================================
// PÁGINA PRINCIPAL
// ============================================================

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("business");
  // Cambios locales aún no guardados
  const [pending, setPending] = useState<UpdateSettingsDto>({});

  const { data: remote, isLoading } = useSettings();
  const { mutate: save, isPending: isSaving } = useUpdateSettings();

  // Merge: datos remotos como base, overrides locales encima
  const settings: StoreSettings | null = remote
    ? { ...remote, ...pending }
    : null;

  const hasPendingChanges = Object.keys(pending).length > 0;

  const handleChange = (patch: UpdateSettingsDto) => {
    setPending((prev) => ({ ...prev, ...patch }));
  };

  const handleSave = () => {
    if (!hasPendingChanges) return;
    save(pending, { onSuccess: () => setPending({}) });
  };

  const tabs: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { key: "business", label: "Negocio", icon: <Store className="h-4 w-4" /> },
    { key: "shipping", label: "Envíos", icon: <Truck className="h-4 w-4" /> },
    {
      key: "payments",
      label: "Pagos",
      icon: <CreditCard className="h-4 w-4" />,
    },
    {
      key: "notifications",
      label: "Notificaciones",
      icon: <Bell className="h-4 w-4" />,
    },
  ];

  return (
    <div className="flex min-h-screen bg-stone-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto py-8 px-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-stone-900">Configuración</h1>
            <p className="text-stone-500 mt-1">
              Ajustá los parámetros de tu tienda
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-stone-100 p-1 rounded-xl mb-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-200 whitespace-nowrap
                  ${
                    activeTab === tab.key
                      ? "bg-white text-stone-900 shadow-sm"
                      : "text-stone-500 hover:text-stone-700 hover:bg-stone-50"
                  }
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-8">
            {isLoading || !settings ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
              </div>
            ) : (
              <>
                {activeTab === "business" && (
                  <BusinessSection
                    settings={settings}
                    onChange={handleChange}
                  />
                )}
                {activeTab === "shipping" && (
                  <ShippingSection
                    settings={settings}
                    onChange={handleChange}
                  />
                )}
                {activeTab === "payments" && (
                  <PaymentsSection
                    settings={settings}
                    onChange={handleChange}
                  />
                )}
                {activeTab === "notifications" && (
                  <NotificationsSection
                    settings={settings}
                    onChange={handleChange}
                  />
                )}
              </>
            )}
          </div>

          {/* Botón guardar — solo visible cuando hay cambios pendientes */}
          {hasPendingChanges && (
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-3 bg-yerba-600 text-white font-medium rounded-xl hover:bg-yerba-700 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSaving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
