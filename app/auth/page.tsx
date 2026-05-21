"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function AuthRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const mode = searchParams.get("mode");
    const params = searchParams.toString();

    if (mode === "resetPassword") {
      router.replace(`/sifre-sifirla?${params}`);
    } else if (mode === "verifyEmail") {
      router.replace(`/dogrula?${params}`);
    }
  }, [searchParams, router]);

  return null;
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthRedirect />
    </Suspense>
  );
}
