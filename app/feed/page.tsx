import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { CopyButton } from "@/components/copy-button";
import { getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TEASER_LEN = 400;

interface FeedPost {
  id: string;
  authorName: string | null;
  authorPhoto: string | null;
  summary: string;
  routedModule: string;
  visibility: string;
  /** 전체공개면 전문, 일부공개면 티저만(서버에서 잘라 전송). */
  prompt: string;
  isFull: boolean;
  thumbnails: string[];
  createdMs: number | null;
}

async function loadFeed(): Promise<FeedPost[]> {
  const db = getAdminDb();
  if (!db) return [];
  try {
    // 복합 인덱스 회피: createdAt 정렬만, visibility 필터는 코드에서(private 제외).
    const snap = await db
      .collection("posts")
      .orderBy("createdAt", "desc")
      .limit(80)
      .get();
    return snap.docs
      .filter((d) => {
        const v = d.data().visibility;
        return v === "public_full" || v === "public_partial";
      })
      .slice(0, 50)
      .map((d) => {
      const data = d.data();
      const full = data.visibility === "public_full";
      const master = typeof data.masterPrompt === "string" ? data.masterPrompt : "";
      const createdAt = data.createdAt;
      return {
        id: d.id,
        authorName: data.authorName ?? null,
        authorPhoto: data.authorPhoto ?? null,
        summary: data.summary ?? "",
        routedModule: data.routedModule ?? "generic",
        visibility: data.visibility,
        // 일부공개는 서버에서 티저로 잘라 전송(전문은 클라이언트로 보내지 않음).
        prompt: full ? master : master.slice(0, TEASER_LEN),
        isFull: full,
        thumbnails: Array.isArray(data.thumbnails) ? data.thumbnails : [],
        createdMs:
          createdAt && typeof createdAt.toMillis === "function"
            ? createdAt.toMillis()
            : null,
      };
    });
  } catch (err) {
    console.warn("[/feed] 조회 실패:", err);
    return [];
  }
}

export default async function FeedPage() {
  const t = await getTranslations("feed");
  const posts = await loadFeed();

  return (
    <main className="min-h-dvh">
      <SiteHeader />
      <section className="mx-auto w-full max-w-2xl px-4 pt-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>

        {posts.length === 0 ? (
          <p className="mt-8 rounded-lg border border-border bg-surface p-8 text-center text-sm text-muted shadow-card">
            {t("empty")}
          </p>
        ) : (
          <div className="mt-6 flex flex-col gap-5">
            {posts.map((p) => (
              <article
                key={p.id}
                className="rounded-lg border border-border bg-surface p-5 shadow-card"
              >
                {/* 작성자 + 형태 */}
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 overflow-hidden rounded-pill bg-surface-2">
                    {p.authorPhoto && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.authorPhoto} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-ink">
                    {p.authorName ?? "익명"}
                  </span>
                  <span className="rounded-pill bg-surface-2 px-2 py-0.5 text-[10px] text-muted">
                    {p.routedModule}
                  </span>
                  {!p.isFull && (
                    <span className="rounded-pill bg-accent-tint px-2 py-0.5 text-[10px] text-accent">
                      {t("partial")}
                    </span>
                  )}
                </div>

                {p.summary && (
                  <p className="mt-2 text-sm text-ink">{p.summary}</p>
                )}

                {/* 공개 이미지 썸네일 */}
                {p.thumbnails.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.thumbnails.map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={src}
                        alt=""
                        className="h-32 w-auto rounded-md border border-border object-cover"
                      />
                    ))}
                  </div>
                )}

                {/* 프롬프트 (전체/티저) */}
                <div className="mt-3 rounded-md bg-bg p-3">
                  <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-ink">
                    {p.prompt}
                    {!p.isFull && (
                      <span className="text-faint">
                        {"\n\n"}… {t("lockedTail")}
                      </span>
                    )}
                  </pre>
                </div>

                {p.isFull && (
                  <div className="mt-3 flex justify-end">
                    <CopyButton text={p.prompt} />
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
