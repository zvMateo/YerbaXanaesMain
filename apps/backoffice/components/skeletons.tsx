"use client";

import { motion } from "motion/react";

// ============================================
// SKELETON COMPONENTS PARA BACKOFFICE
// ============================================

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-10 w-64 bg-stone-200 rounded-lg animate-pulse" />
        <div className="h-10 w-32 bg-stone-200 rounded-lg animate-pulse" />
      </div>

      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-3 flex-1">
                <div className="h-4 w-24 bg-stone-200 rounded animate-pulse" />
                <div className="h-8 w-32 bg-stone-300 rounded animate-pulse" />
                <div className="h-4 w-20 bg-stone-200 rounded animate-pulse" />
              </div>
              <div className="w-12 h-12 bg-stone-200 rounded-xl animate-pulse" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
          <div className="h-6 w-48 bg-stone-200 rounded animate-pulse mb-6" />
          <div className="h-64 bg-stone-100 rounded-xl animate-pulse" />
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
          <div className="h-6 w-32 bg-stone-200 rounded animate-pulse mb-6" />
          <div className="h-48 bg-stone-100 rounded-xl animate-pulse mb-4" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-3 w-20 bg-stone-200 rounded animate-pulse" />
                <div className="h-3 w-8 bg-stone-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom section skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200"
          >
            <div className="h-6 w-40 bg-stone-200 rounded animate-pulse mb-6" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-stone-200 rounded-lg animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-stone-200 rounded animate-pulse" />
                    <div className="h-3 w-20 bg-stone-200 rounded animate-pulse" />
                  </div>
                  <div className="h-4 w-16 bg-stone-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-stone-200 rounded animate-pulse" />
        <div className="h-10 w-32 bg-stone-200 rounded-lg animate-pulse" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200">
        <div className="flex gap-4">
          <div className="flex-1 h-10 bg-stone-200 rounded-lg animate-pulse" />
          <div className="w-40 h-10 bg-stone-200 rounded-lg animate-pulse" />
          <div className="w-40 h-10 bg-stone-200 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Products list */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl p-4 border border-stone-200"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-stone-200 rounded-xl animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-48 bg-stone-300 rounded animate-pulse" />
                <div className="h-4 w-24 bg-stone-200 rounded animate-pulse" />
              </div>
              <div className="h-6 w-20 bg-stone-200 rounded animate-pulse" />
              <div className="h-6 w-24 bg-stone-200 rounded animate-pulse" />
              <div className="flex gap-2">
                <div className="w-8 h-8 bg-stone-200 rounded-lg animate-pulse" />
                <div className="w-8 h-8 bg-stone-200 rounded-lg animate-pulse" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function OrdersSkeleton() {
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 h-10 bg-stone-200 rounded-lg animate-pulse" />
          <div className="flex gap-2">
            <div className="w-40 h-10 bg-stone-200 rounded-lg animate-pulse" />
            <div className="w-32 h-10 bg-stone-200 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="h-12 bg-stone-50 border-b border-stone-200" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-16 border-b border-stone-100 px-4 flex items-center gap-4"
          >
            <div className="w-4 h-4 bg-stone-200 rounded animate-pulse" />
            <div className="w-24 h-4 bg-stone-200 rounded animate-pulse" />
            <div className="flex-1 h-4 bg-stone-200 rounded animate-pulse" />
            <div className="w-20 h-4 bg-stone-200 rounded animate-pulse" />
            <div className="w-24 h-4 bg-stone-200 rounded animate-pulse" />
            <div className="w-20 h-6 bg-stone-200 rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CustomersSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200"
          >
            <div className="h-4 w-24 bg-stone-200 rounded animate-pulse mb-2" />
            <div className="h-8 w-16 bg-stone-300 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200">
            <div className="h-10 bg-stone-200 rounded-lg animate-pulse mb-4" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-4 border border-stone-200"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-stone-200 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-32 bg-stone-300 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-stone-200 rounded animate-pulse" />
                </div>
                <div className="h-6 w-20 bg-stone-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
            <div className="h-48 bg-stone-100 rounded-xl animate-pulse mb-4" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="h-3 w-20 bg-stone-200 rounded animate-pulse" />
                  <div className="h-3 w-8 bg-stone-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-white rounded-2xl p-6 shadow-sm border border-stone-200 ${className}`}
    >
      <div className="h-6 w-32 bg-stone-200 rounded animate-pulse mb-4" />
      <div className="h-32 bg-stone-100 rounded-xl animate-pulse" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div className="h-16 border-b border-stone-100 px-4 flex items-center gap-4">
      {Array.from({ length: columns }).map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-stone-200 rounded animate-pulse ${
            i === 0 ? "w-4" : i === 1 ? "w-24 flex-1" : "w-20"
          }`}
        />
      ))}
    </div>
  );
}
