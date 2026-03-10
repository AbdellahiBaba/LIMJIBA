import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";
import type { CmsPage, StoreSettings } from "@shared/schema";

export default function StoreTerms() {
  const { data: page, isLoading } = useQuery<CmsPage>({ queryKey: ["/api/store/pages/terms"] });
  const { data: settings } = useQuery<StoreSettings>({ queryKey: ["/api/store/settings"] });
  const primaryColor = settings?.primaryColor || "#1B3A6B";
  const accentColor = settings?.accentColor || "#C9A84C";

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Skeleton className="h-10 w-48 mb-6" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  let content: any = {};
  try { content = JSON.parse(page?.content || "{}"); } catch {}

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-6" style={{ color: primaryColor }} data-testid="text-terms-title">
        <FileText className="inline h-8 w-8 mr-2" style={{ color: accentColor }} />
        {page?.title || "Terms & Conditions"}
      </h1>
      <div className="prose prose-lg max-w-none">
        {content.body ? (
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{content.body}</p>
        ) : (
          <div className="rounded-xl p-8 text-center" style={{ background: `linear-gradient(135deg, ${primaryColor}08, ${accentColor}08)` }}>
            <p className="text-gray-500">Terms & conditions content can be managed from the admin CMS.</p>
          </div>
        )}
      </div>
    </div>
  );
}
