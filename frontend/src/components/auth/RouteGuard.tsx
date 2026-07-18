"use client";

import { useAuthStore } from "@/stores/auth-store";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";

interface RouteGuardProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

export function RouteGuard({ children, requiredPermission }: RouteGuardProps) {
  const { isHydrated, hasPermission, isSuperAdmin } = useAuthStore();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || !isHydrated) {
    return (
      <div className="flex h-[calc(100vh-100px)] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const authorized = isSuperAdmin || (requiredPermission ? hasPermission(requiredPermission) : true);

  if (!authorized) {
    return (
      <div className="flex h-[calc(100vh-100px)] w-full flex-col items-center justify-center">
        <div className="max-w-md text-center bg-white dark:bg-[#1e1e1e] p-10 rounded-3xl shadow-sm border border-red-100 dark:border-red-900/30">
          <ShieldAlert className="mx-auto h-20 w-20 text-red-500 mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">403 Forbidden</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            Your current role does not have the required enterprise permission <br />
            <span className="inline-block mt-2 font-mono text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-1 rounded-md">
              {requiredPermission || "Unknown"}
            </span>
            <br />
            to access this module.
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-8 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
