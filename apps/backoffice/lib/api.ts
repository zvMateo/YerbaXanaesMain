// 📁 apps/backoffice/lib/api.ts
// API Client para el backoffice

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
).replace(/\/+$/, "");

// Helper para fetch con error handling
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: "include", // Send Better Auth session cookie automatically
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.message || `Error ${response.status}: ${response.statusText}`,
    );
  }

  return response.json();
}

// Dashboard
export async function getDashboardStats() {
  return fetchAPI<{
    todaySales: number;
    todayOrders: number;
    totalProducts: number;
    totalCustomers: number;
    lowStockItems: number;
    recentOrders: any[];
  }>("/dashboard/stats");
}

// Orders
export async function getOrders(params?: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append("status", params.status);
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.limit) queryParams.append("limit", params.limit.toString());

  return fetchAPI(`/orders?${queryParams.toString()}`);
}

export async function updateOrderStatus(id: string, status: string) {
  return fetchAPI(`/orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// Products
export async function getProducts() {
  return fetchAPI("/catalog");
}

export async function updateProduct(id: string, data: any) {
  return fetchAPI(`/catalog/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// Inventory
export async function getInventory() {
  return fetchAPI("/inventory");
}

export async function updateStock(id: string, quantity: number) {
  return fetchAPI(`/inventory/${id}/adjust`, {
    method: "POST",
    body: JSON.stringify({ quantity }),
  });
}
