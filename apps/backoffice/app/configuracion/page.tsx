"use client";

import { useState, useEffect } from "react";
import { Sidebar, QuickActions } from "@/components/sidebar";
import {
  Store,
  Truck,
  CreditCard,
  Bell,
  Save,
  CheckCircle,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Package,
  Info,
} from "lucide-react";
import { toast } from "sonner";

// ============================================================
// TIPOS
// ============================================================

interface BusinessSettings {
  businessName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
}

interface ShippingSettings {
  enabled: boolean;
  flatRate: number;
  freeShippingThreshold: number;
  // TODO: Integrar librería de envíos (pendiente)
  provider: "flat" | "correo_argentino" | "oca" | "andreani";
}

interface NotificationSettings {
  newOrderEmail: string;
  lowStockAlert: boolean;
  lowStockThreshold: number;
}

interface PaymentSettings {
  mercadoPago: boolean;
  cash: boolean;
  transfer: boolean;
}

type SettingsTab = "business" | "shipping" | "payments" | "notifications";

// ============================================================
// HELPERS — localStorage
// ============================================================

const STORAGE_PREFIX = "yx-settings";

function loadSettings<T>(key: string, defaults: T): T {
  if (typeof window === "undefined") return defaults;
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}-${key}`);
    return stored ? JSON.parse(stored) : defaults;
  } catch {
    return defaults;
  }
}

function saveSettings<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${STORAGE_PREFIX}-${key}`, JSON.stringify(data));
}

// ============================================================
// DEFAULTS
// ============================================================

const DEFAULT_BUSINESS: BusinessSettings = {
  businessName: "YerbaXanaes",
  email: "contacto@yerbaxanaes.com",
  phone: "",
  address: "",
  city: "",
};

const DEFAULT_SHIPPING: ShippingSettings = {
  enabled: true,
  flatRate: 1500,
  freeShippingThreshold: 15000,
  provider: "flat",
};

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  newOrderEmail: "",
  lowStockAlert: true,
  lowStockThreshold: 10,
};

const DEFAULT_PAYMENTS: PaymentSettings = {
  mercadoPago: true,
  cash: true,
  transfer: true,
};

// ============================================================
// COMPONENTES DE SECCIÓN
// ============================================================

function BusinessSection({
  settings,
  onChange,
}: {
  settings: BusinessSettings;
  onChange: (s: BusinessSettings) => void;
}) {
  const fields: {
    key: keyof BusinessSettings;
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
                value={settings[field.key] || ""}
                onChange={(e) =>
                  onChange({ ...settings, [field.key]: e.target.value })
                }
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
  settings: ShippingSettings;
  onChange: (s: ShippingSettings) => void;
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

      {/* Toggle envío */}
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
            checked={settings.enabled}
            onChange={(e) =>
              onChange({ ...settings, enabled: e.target.checked })
            }
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yerba-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yerba-600"></div>
        </label>
      </div>

      {settings.enabled && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              <DollarSign className="h-4 w-4 inline mr-1" />
              Tarifa plana de envío ($)
            </label>
            <input
              type="number"
              value={settings.flatRate}
              onChange={(e) =>
                onChange({ ...settings, flatRate: Number(e.target.value) })
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
                onChange({
                  ...settings,
                  freeShippingThreshold: Number(e.target.value),
                })
              }
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:border-yerba-500 focus:ring-2 focus:ring-yerba-100 transition-all focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* TODO: Integración con librería de envíos */}
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
  settings: PaymentSettings;
  onChange: (s: PaymentSettings) => void;
}) {
  const methods: {
    key: keyof PaymentSettings;
    name: string;
    desc: string;
    color: string;
  }[] = [
    {
      key: "mercadoPago",
      name: "MercadoPago",
      desc: "Tarjetas de crédito/débito, dinero en cuenta",
      color: "bg-blue-100 text-blue-600",
    },
    {
      key: "cash",
      name: "Efectivo",
      desc: "Pago al recibir o retiro en local",
      color: "bg-green-100 text-green-600",
    },
    {
      key: "transfer",
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
                checked={settings[method.key]}
                onChange={(e) => {
                  const updated: PaymentSettings = { ...settings };
                  updated[method.key] = e.target.checked;
                  onChange(updated);
                }}
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
  settings: NotificationSettings;
  onChange: (s: NotificationSettings) => void;
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
          value={settings.newOrderEmail}
          onChange={(e) =>
            onChange({ ...settings, newOrderEmail: e.target.value })
          }
          className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:border-yerba-500 focus:ring-2 focus:ring-yerba-100 transition-all focus:outline-none"
          placeholder="tu-email@ejemplo.com"
        />
      </div>

      {/* Alerta de stock bajo */}
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
            onChange={(e) =>
              onChange({ ...settings, lowStockAlert: e.target.checked })
            }
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
              onChange({
                ...settings,
                lowStockThreshold: Number(e.target.value),
              })
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
  const [hasChanges, setHasChanges] = useState(false);

  const [business, setBusiness] = useState<BusinessSettings>(() =>
    loadSettings("business", DEFAULT_BUSINESS),
  );
  const [shipping, setShipping] = useState<ShippingSettings>(() =>
    loadSettings("shipping", DEFAULT_SHIPPING),
  );
  const [notifications, setNotifications] = useState<NotificationSettings>(() =>
    loadSettings("notifications", DEFAULT_NOTIFICATIONS),
  );
  const [payments, setPayments] = useState<PaymentSettings>(() =>
    loadSettings("payments", DEFAULT_PAYMENTS),
  );

  // Detectar cambios
  useEffect(() => {
    // Simple: si algo difiere de lo guardado, hay cambios
    setHasChanges(true);
  }, [business, shipping, notifications, payments]);

  const handleSave = () => {
    saveSettings("business", business);
    saveSettings("shipping", shipping);
    saveSettings("notifications", notifications);
    saveSettings("payments", payments);
    setHasChanges(false);
    toast.success("Configuración guardada", {
      description: "Los cambios se aplicaron correctamente",
    });
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
            {activeTab === "business" && (
              <BusinessSection settings={business} onChange={setBusiness} />
            )}
            {activeTab === "shipping" && (
              <ShippingSection settings={shipping} onChange={setShipping} />
            )}
            {activeTab === "payments" && (
              <PaymentsSection settings={payments} onChange={setPayments} />
            )}
            {activeTab === "notifications" && (
              <NotificationsSection
                settings={notifications}
                onChange={setNotifications}
              />
            )}
          </div>

          {/* Save Button */}
          {hasChanges && (
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-3 bg-yerba-600 text-white font-medium rounded-xl hover:bg-yerba-700 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Save className="h-4 w-4" />
                Guardar cambios
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
