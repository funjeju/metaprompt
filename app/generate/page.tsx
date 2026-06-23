import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { GenerateFlow } from "@/components/generate-flow";

// useSearchParams 를 쓰는 클라이언트 컴포넌트는 Suspense 경계가 필요하다.
export default function GeneratePage() {
  return (
    <main className="min-h-dvh">
      <SiteHeader />
      <Suspense fallback={<div className="py-20 text-center text-muted">…</div>}>
        <GenerateFlow />
      </Suspense>
    </main>
  );
}
