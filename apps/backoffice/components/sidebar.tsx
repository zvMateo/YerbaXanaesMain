"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Users,
  LogOut,
  Menu,
  X,
  Leaf,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
  Settings,
  HelpCircle,
  Search,
  Sparkles,
  FolderOpen,
  Tag,
  Star,
  type LucideIcon,
} from "lucide-react";
import {
  useState,
  useEffect,
  useRef,
  useSyncExternalStore,
  useCallback,
} from "react";
import { useAuth } from "@/hooks/use-auth";
import { createPortal } from "react-dom";

import { useOrders } from "@/hooks/use-orders";
import { useInventory } from "@/hooks/use-inventory";
import { useRatings } from "@/hooks/use-ratings";
import { useMounted } from "@/hooks/use-mounted";

// ============================================
// HOOK PARA PERSISTIR ESTADO DE SIDEBAR
// ============================================

const STORAGE_KEY = "yerbaxanaes-sidebar-collapsed";

function useSidebarCollapsed() {
  // Lee del localStorage de forma síncrona y segura
  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "true";
  }, []);

  // Suscripción a cambios (para sincronizar entre tabs)
  const subscribe = useCallback((callback: () => void) => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        callback();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const isCollapsed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => false, // Valor por defecto en SSR
  );

  const setIsCollapsed = useCallback((value: boolean) => {
    localStorage.setItem(STORAGE_KEY, value.toString());
    // Disparar evento manualmente para actualizar otros componentes
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEY,
        newValue: value.toString(),
      }),
    );
  }, []);

  return [isCollapsed, setIsCollapsed] as const;
}

// ============================================
// CONFIGURACIÓN DE NAVEGACIÓN
// ============================================
/** Entrada del menu lateral. `description`, `shortcut` e `id` solo los trae
 *  la navegacion principal; el menu secundario no. */
interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  shortcut?: string;
  id?: string;
}

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    description: "Resumen general",
    shortcut: "⌘D",
  },
  {
    name: "Órdenes",
    href: "/ordenes",
    icon: ShoppingCart,
    description: "Gestión de pedidos",
    id: "orders",
    shortcut: "⌘O",
  },
  {
    name: "Productos",
    href: "/productos",
    icon: Package,
    description: "Catálogo y variantes",
    shortcut: "⌘P",
  },
  {
    name: "Clientes",
    href: "/clientes",
    icon: Users,
    description: "Base de clientes",
    shortcut: "⌘C",
  },
  {
    name: "Inventario",
    href: "/inventario",
    icon: Warehouse,
    description: "Stock y materia prima",
    id: "inventory",
    shortcut: "⌘I",
  },
  {
    name: "Categorías",
    href: "/categorias",
    icon: FolderOpen,
    description: "Organización de productos",
    shortcut: "⌘K",
  },
  {
    name: "Cupones",
    href: "/cupones",
    icon: Tag,
    description: "Descuentos y promociones",
  },
  {
    name: "Reseñas",
    href: "/resenas",
    icon: Star,
    description: "Moderación de reseñas",
    id: "ratings",
  },
];

const secondaryNavigation = [
  { name: "Configuración", href: "/configuracion", icon: Settings },
  { name: "Ayuda", href: "/ayuda", icon: HelpCircle },
];

// ============================================
// COMPONENTES INTERNOS
// ============================================

function NavItem({
  item,
  isCollapsed,
  isActive,
  badgeCount,
  onNavigate,
}: {
  item: NavigationItem;
  isCollapsed: boolean;
  isActive: boolean;
  badgeCount?: number;
  onNavigate?: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const iconRef = useRef<HTMLDivElement>(null);
  const Icon = item.icon;

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (iconRef.current && isCollapsed) {
      const rect = iconRef.current.getBoundingClientRect();
      setTooltipPos({
        top: rect.top + rect.height / 2,

        left: rect.right + 20,
      });
    }
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link
        href={item.href}
        onClick={onNavigate}
        className={`
          relative flex items-center gap-3 px-3 py-2.5 rounded-xl
          transition-all duration-200 group
          ${isCollapsed ? "justify-center" : ""}
          ${
            isActive
              ? "bg-yerba-50 text-yerba-700 shadow-sm"
              : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
          }
        `}
      >
        {/* Indicador Activo */}
        {isActive && (
          <motion.div
            layoutId="activeNav"
            className="absolute left-0 w-1 h-6 bg-yerba-600 rounded-r-full"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}

        {/* Icono + Badge */}
        <div className="relative" ref={iconRef}>
          <Icon
            className={`h-5 w-5 transition-colors ${
              isActive
                ? "text-yerba-600"
                : "text-stone-400 group-hover:text-stone-600"
            }`}
          />
          {badgeCount !== undefined && badgeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
              {item.id === "inventory" ? "!" : badgeCount}
            </span>
          )}
        </div>

        {/* Texto (solo si no está colapsado) */}
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm truncate">{item.name}</span>
              {item.shortcut && (
                <span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
                  {item.shortcut}
                </span>
              )}
            </div>
            <p
              className={`text-[10px] truncate ${isActive ? "text-yerba-600" : "text-stone-400"}`}
            >
              {item.description}
            </p>
          </div>
        )}
      </Link>

      {/* Tooltip con Portal (para evitar que se corte) */}
      {isCollapsed &&
        isHovered &&
        typeof window !== "undefined" &&
        createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, x: -10, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "fixed",
                top: tooltipPos.top,
                left: tooltipPos.left,
                transform: "translateY(-50%)",
                zIndex: 9999,
              }}
              className="px-3 py-2 bg-stone-900 text-white text-xs rounded-lg whitespace-nowrap shadow-xl pointer-events-none"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{item.name}</span>
                {badgeCount !== undefined && badgeCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-500 rounded-full text-[10px]">
                    {item.id === "inventory" ? "!" : badgeCount}
                  </span>
                )}
              </div>
              {/* Flecha */}
              <div
                className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2"
                style={{
                  width: 0,
                  height: 0,
                  borderTop: "6px solid transparent",
                  borderBottom: "6px solid transparent",
                  borderRight: "6px solid #1c1917",
                }}
              />
            </motion.div>
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

/**
 * Avatar del usuario — renderizado solo en el cliente para evitar
 * el hydration mismatch entre SSR (sin sesión) y cliente (con Google image).
 */
function UserAvatar({
  user,
  userInitials,
}: {
  user: { name?: string | null; image?: string | null } | null;
  userInitials: string;
}) {
  const mounted = useMounted();

  if (mounted && user?.image) {
    return (
      <img
        src={user.image}
        alt={user.name || "Usuario"}
        className="w-10 h-10 rounded-full object-cover shadow-lg"
      />
    );
  }

  return (
    <div className="w-10 h-10 bg-gradient-to-br from-yerba-400 to-yerba-600 rounded-full flex items-center justify-center text-white font-semibold shadow-lg">
      {userInitials}
    </div>
  );
}

function SidebarContent({
  isCollapsed,
  logout,
  setIsCollapsed,
  user,
  userInitials,
  onNavigate,
}: {
  isCollapsed: boolean;
  logout: () => void;
  setIsCollapsed: (v: boolean) => void;
  user: {
    id: string;
    email: string;
    name?: string;
    role: "USER" | "ADMIN";
    image?: string;
  } | null;
  userInitials: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  // Hooks para datos reales
  const { data: orders = [] } = useOrders();
  const { data: inventory = [] } = useInventory();
  const { data: ratings = [] } = useRatings();

  // Cálculos de notificaciones
  const pendingOrders = orders.filter((o) => o.status === "PENDING").length;
  const lowStockItems = inventory.filter(
    (i) => i.minStockAlert !== null && i.currentStock <= i.minStockAlert,
  ).length;
  const pendingRatings = ratings.filter((r) => !r.isApproved).length;

  const getBadgeCount = (id?: string) => {
    if (id === "orders") return pendingOrders;
    if (id === "inventory") return lowStockItems;
    if (id === "ratings") return pendingRatings;
    return 0;
  };

  const totalNotifications = pendingOrders + lowStockItems + pendingRatings;

  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notifRef.current &&
        !notifRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* COLLAPSE BUTTON - TOP (Only when collapsed) */}
      {isCollapsed && (
        <div className="p-3 border-b border-stone-200">
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-full flex items-center justify-center p-2 rounded-xl bg-stone-50 hover:bg-yerba-50 text-stone-500 hover:text-yerba-600 transition-all duration-200 group"
            title="Expandir menú"
          >
            <PanelLeftOpen className="h-5 w-5 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      )}

      {/* HEADER */}
      <div className="p-4 border-b border-stone-200">
        <Link
          href="/"
          className={`flex items-center gap-3 transition-all ${isCollapsed ? "justify-center" : ""}`}
        >
          <div className="p-2.5 bg-gradient-to-br from-yerba-500 to-yerba-700 rounded-xl shadow-lg shadow-yerba-500/25 shrink-0">
            <Leaf className="h-6 w-6 text-white" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="font-serif text-lg font-bold text-stone-900 leading-tight truncate">
                YerbaXanaes
              </h1>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider font-medium truncate">
                Administración
              </p>
            </div>
          )}
        </Link>
      </div>

      {/* SEARCH */}
      {!isCollapsed && (
        <div className="px-4 py-3 border-b border-stone-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yerba-500/20 focus:border-yerba-500 transition-all"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
              ⌘K
            </span>
          </div>
        </div>
      )}

      {/* NAV PRINCIPAL */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {!isCollapsed && (
          <p className="px-3 mb-2 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
            Menú Principal
          </p>
        )}
        {navigation.map((item) => (
          <NavItem
            key={item.name}
            item={item}
            isCollapsed={isCollapsed}
            isActive={
              pathname === item.href || pathname.startsWith(`${item.href}/`)
            }
            badgeCount={getBadgeCount(item.id)}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {/* NAV SECUNDARIA */}
      <div className="py-4 px-3 border-t border-stone-200 space-y-1">
        {!isCollapsed && (
          <p className="px-3 mb-2 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
            Soporte
          </p>
        )}
        {secondaryNavigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl
                text-stone-600 hover:bg-stone-50 hover:text-stone-900
                transition-all duration-200 group
                ${isCollapsed ? "justify-center" : ""}
              `}
              title={isCollapsed ? item.name : undefined}
            >
              <Icon className="h-5 w-5 text-stone-400 group-hover:text-stone-600" />
              {!isCollapsed && (
                <span className="text-sm font-medium">{item.name}</span>
              )}
            </Link>
          );
        })}
      </div>

      {/* USER PROFILE */}
      <div className="p-4 border-t border-stone-200">
        <div
          className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}
        >
          <div className="relative shrink-0">
            <UserAvatar user={user} userInitials={userInitials} />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
          </div>

          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-900 truncate">
                {user?.name || "Usuario"}
              </p>
              <p className="text-xs text-stone-500 truncate">
                {user?.email || ""}
              </p>
            </div>
          )}

          {!isCollapsed && totalNotifications > 0 && (
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {totalNotifications}
                </span>
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute bottom-full right-0 mb-2 w-64 bg-white rounded-xl shadow-xl border border-stone-200 overflow-hidden z-50"
                  >
                    <div className="p-3 bg-stone-50 border-b border-stone-200">
                      <h3 className="text-sm font-bold text-stone-900">
                        Notificaciones
                      </h3>
                    </div>
                    <div className="p-2 space-y-1">
                      {pendingOrders > 0 && (
                        <Link
                          href="/ordenes"
                          onClick={() => setShowNotifications(false)}
                          className="flex items-start gap-3 p-2 hover:bg-stone-50 rounded-lg transition-colors"
                        >
                          <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg shrink-0">
                            <ShoppingCart className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-stone-900">
                              Órdenes pendientes
                            </p>
                            <p className="text-xs text-stone-500">
                              Tenés {pendingOrders}{" "}
                              {pendingOrders === 1 ? "orden" : "órdenes"} por
                              revisar
                            </p>
                          </div>
                        </Link>
                      )}

                      {lowStockItems > 0 && (
                        <Link
                          href="/inventario"
                          onClick={() => setShowNotifications(false)}
                          className="flex items-start gap-3 p-2 hover:bg-stone-50 rounded-lg transition-colors"
                        >
                          <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg shrink-0">
                            <Warehouse className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-stone-900">
                              Stock bajo
                            </p>
                            <p className="text-xs text-stone-500">
                              Hay {lowStockItems} insumos con poco stock
                            </p>
                          </div>
                        </Link>
                      )}

                      {pendingRatings > 0 && (
                        <Link
                          href="/resenas"
                          onClick={() => setShowNotifications(false)}
                          className="flex items-start gap-3 p-2 hover:bg-stone-50 rounded-lg transition-colors"
                        >
                          <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg shrink-0">
                            <Star className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-stone-900">
                              Nuevas reseñas
                            </p>
                            <p className="text-xs text-stone-500">
                              Tenés {pendingRatings}{" "}
                              {pendingRatings === 1 ? "reseña" : "reseñas"} para
                              moderar
                            </p>
                          </div>
                        </Link>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <button
          onClick={logout}
          className={`
            flex items-center gap-3 mt-3 px-3 min-h-11 py-2.5 w-full
            text-stone-600 hover:text-red-600 hover:bg-red-50 
            rounded-xl transition-colors
            ${isCollapsed ? "justify-center" : ""}
          `}
          title={isCollapsed ? "Cerrar sesión" : undefined}
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && (
            <span className="text-sm font-medium">Cerrar sesión</span>
          )}
        </button>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function Sidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useSidebarCollapsed();
  const { logout, user } = useAuth();
  const pathname = usePathname();

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  // Cerrar el menu al navegar. Va durante el render y no en un efecto: un
  // efecto alcanza a pintar el menu abierto sobre la pagina nueva y recien
  // despues lo cierra. El click en un item ya llama a closeMobileMenu; esto
  // cubre los atajos de teclado y el boton atras del browser.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setIsMobileMenuOpen(false);
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        const key = e.key.toLowerCase();
        const item = navigation.find((n) =>
          n.shortcut?.toLowerCase().endsWith(key),
        );
        if (item) {
          e.preventDefault();
          window.location.href = item.href;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobileMenuOpen]);

  const pageTitle =
    [...navigation, ...secondaryNavigation].find((item) =>
      item.href === "/"
        ? pathname === "/"
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
    )?.name ?? "YerbaXanaes";

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-1 border-b border-stone-200 bg-white px-2 lg:hidden">
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-stone-700 hover:bg-stone-50"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-stone-900">
            {pageTitle}
          </p>
          <p className="truncate text-[10px] font-medium uppercase tracking-wider text-stone-500">
            YerbaXanaes
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-stone-600 hover:bg-red-50 hover:text-red-600"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobileMenu}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-[min(18rem,100vw)] bg-white shadow-2xl lg:hidden"
            >
              <div className="relative h-full">
                <button
                  type="button"
                  onClick={closeMobileMenu}
                  className="absolute top-3 right-3 inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-50 hover:text-stone-600"
                  aria-label="Cerrar menú"
                >
                  <X className="h-6 w-6" />
                </button>
                <SidebarContent
                  isCollapsed={false}
                  logout={logout}
                  setIsCollapsed={setIsCollapsed}
                  user={user}
                  userInitials={userInitials}
                  onNavigate={closeMobileMenu}
                />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <motion.aside
        animate={{ width: isCollapsed ? 80 : 280 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="sticky top-0 z-40 hidden h-screen flex-col border-r border-stone-200 bg-white shadow-sm lg:flex"
      >
        <div className="relative flex flex-1 flex-col overflow-hidden">
          <SidebarContent
            isCollapsed={isCollapsed}
            logout={logout}
            setIsCollapsed={setIsCollapsed}
            user={user}
            userInitials={userInitials}
          />

          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="absolute top-6 right-2 z-50 flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 shadow-md transition-all duration-200 hover:scale-105 hover:border-yerba-300 hover:bg-yerba-50 hover:text-yerba-600 focus:outline-none focus:ring-2 focus:ring-yerba-500/20"
              aria-label="Colapsar menú"
              title="Colapsar menú"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>
      </motion.aside>
    </>
  );
}

// ============================================
// QUICK ACTIONS
// ============================================

export function QuickActions() {
  const actions = [
    { icon: ShoppingCart, label: "Nueva Orden", color: "bg-blue-500" },
    { icon: Package, label: "Nuevo Producto", color: "bg-yerba-500" },
    { icon: Sparkles, label: "Campaña", color: "bg-purple-500" },
  ];

  return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 lg:hidden">
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={`p-3 ${action.color} text-white rounded-full shadow-lg hover:shadow-xl transition-shadow`}
            title={action.label}
          >
            <Icon className="h-5 w-5" />
          </motion.button>
        );
      })}
    </div>
  );
}
