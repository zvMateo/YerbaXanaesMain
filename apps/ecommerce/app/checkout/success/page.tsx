import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle,
  Package,
  Clock,
  Mail,
  ShoppingBag,
  ArrowRight,
  AlertCircle,
  XCircle,
} from "lucide-react";

interface SuccessPageProps {
  searchParams: Promise<{
    orderId?: string;
    paymentId?: string;
    status?: string;
    payment_id?: string; // param que agrega MP al redirigir
    merchant_order_id?: string; // param que agrega MP al redirigir
  }>;
}

export const metadata: Metadata = {
  title: "Estado del Pedido | YerbaXanaes",
  description: "Información sobre el estado de tu compra",
};

export default async function CheckoutSuccessPage({
  searchParams,
}: SuccessPageProps) {
  const params = await searchParams;
  const { orderId, paymentId, status, payment_id } = params;

  // Normalizar: MP puede volver con ?payment_id=xxx o ?paymentId=xxx
  const resolvedPaymentId = paymentId || payment_id;
  const resolvedId = orderId || resolvedPaymentId;

  if (!resolvedId) {
    redirect("/");
  }

  // MP agrega status=approved | pending | null al back_url en producción
  const isPending = status === "pending" || status === "in_process";
  const isFailure = status === "failure" || status === "rejected";

  // ── Estado: Pedido Pendiente ──────────────────────────────────────────────
  if (isPending) {
    return (
      <PageShell>
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
              <Clock className="w-12 h-12 text-amber-600" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-stone-900 mb-2">
            Pago en proceso
          </h1>
          <p className="text-stone-600 mb-6">
            Tu pago está siendo verificado. Esto puede tardar unos minutos para
            medios offline (Rapipago, Pago Fácil, etc.)
          </p>

          <OrderIdBox id={resolvedId} label="Número de referencia" />

          <div className="text-left space-y-4 mb-8">
            <h2 className="font-semibold text-stone-900">¿Qué pasa ahora?</h2>
            <InfoRow
              icon={<Mail className="w-4 h-4 text-amber-600" />}
              color="amber"
              title="Confirmación por email"
              text="Te avisamos cuando se acredite el pago"
            />
            <InfoRow
              icon={<Package className="w-4 h-4 text-amber-600" />}
              color="amber"
              title="Preparación del pedido"
              text="Empezamos a preparar tu yerba cuando se confirme el pago"
            />
          </div>

          <ActionButtons />
        </div>
      </PageShell>
    );
  }

  // ── Estado: Pago Fallido ──────────────────────────────────────────────────
  if (isFailure) {
    return (
      <PageShell>
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-stone-900 mb-2">
            Pago no completado
          </h1>
          <p className="text-stone-600 mb-8">
            El pago no pudo procesarse. Podés intentar de nuevo con otro medio
            de pago.
          </p>

          <div className="space-y-3">
            <Link
              href="/checkout"
              className="flex items-center justify-center gap-2 w-full bg-yerba-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-yerba-700 transition-colors"
            >
              Intentar de nuevo
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/"
              className="flex items-center justify-center w-full text-stone-600 px-6 py-3 rounded-full font-medium hover:text-stone-900 transition-colors"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  // ── Estado: Pago Exitoso (default) ────────────────────────────────────────
  return (
    <PageShell>
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-yerba-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-12 h-12 text-yerba-600" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-stone-900 mb-2">
          ¡Pedido Confirmado!
        </h1>
        <p className="text-stone-600 mb-6">
          Gracias por tu compra. Te enviamos un email con todos los detalles.
        </p>

        <OrderIdBox id={resolvedId} label="Número de orden" />

        <div className="text-left space-y-4 mb-8">
          <h2 className="font-semibold text-stone-900">¿Qué sigue?</h2>
          <InfoRow
            icon={<Mail className="w-4 h-4 text-yerba-600" />}
            color="yerba"
            title="Confirmación por email"
            text="Te enviamos un email con todos los detalles de tu pedido"
          />
          <InfoRow
            icon={<Clock className="w-4 h-4 text-yerba-600" />}
            color="yerba"
            title="Procesamiento"
            text="Prepararemos tu pedido en 24-48 horas hábiles"
          />
          <InfoRow
            icon={<Package className="w-4 h-4 text-yerba-600" />}
            color="yerba"
            title="Envío"
            text="Te notificaremos cuando tu pedido esté en camino"
          />
        </div>

        <ActionButtons />
      </div>
    </PageShell>
  );
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <header className="bg-white border-b border-stone-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-center">
          <Link
            href="/"
            className="font-serif text-2xl font-bold text-yerba-600"
          >
            YerbaXanaes
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="max-w-lg w-full">
          {children}
          <p className="text-center text-sm text-stone-500 mt-6">
            ¿Tenés alguna pregunta?{" "}
            <a
              href="mailto:hola@yerbaxanaes.com"
              className="text-yerba-600 hover:underline"
            >
              Contactanos
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

function OrderIdBox({ id, label }: { id: string; label: string }) {
  return (
    <div className="bg-stone-50 rounded-xl p-4 mb-6">
      <p className="text-sm text-stone-500 mb-1">{label}</p>
      <p className="text-xl font-mono font-semibold text-stone-900">
        #{id.slice(0, 8).toUpperCase()}
      </p>
    </div>
  );
}

function InfoRow({
  icon,
  color,
  title,
  text,
}: {
  icon: React.ReactNode;
  color: "yerba" | "amber";
  title: string;
  text: string;
}) {
  const bgColor = color === "yerba" ? "bg-yerba-100" : "bg-amber-100";
  return (
    <div className="flex items-start gap-3">
      <div
        className={`w-8 h-8 ${bgColor} rounded-lg flex items-center justify-center shrink-0`}
      >
        {icon}
      </div>
      <div>
        <p className="font-medium text-stone-900">{title}</p>
        <p className="text-sm text-stone-600">{text}</p>
      </div>
    </div>
  );
}

function ActionButtons() {
  return (
    <div className="space-y-3">
      <Link
        href="/productos"
        className="flex items-center justify-center gap-2 w-full bg-yerba-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-yerba-700 transition-colors"
      >
        <ShoppingBag className="w-5 h-5" />
        Seguir Comprando
        <ArrowRight className="w-5 h-5" />
      </Link>
      <Link
        href="/"
        className="flex items-center justify-center w-full text-stone-600 px-6 py-3 rounded-full font-medium hover:text-stone-900 transition-colors"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
