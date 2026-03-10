import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Info } from "lucide-react";
import type { CmsPage, StoreSettings } from "@shared/schema";

export default function StoreAbout() {
  const { data: page, isLoading } = useQuery<CmsPage>({ queryKey: ["/api/store/pages/about"] });
  const { data: settings } = useQuery<StoreSettings>({ queryKey: ["/api/store/settings"] });
  const primaryColor = settings?.primaryColor || "#4A0E4E";
  const accentColor = settings?.accentColor || "#D4AF37";

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
      <h1 className="text-3xl font-bold mb-6" style={{ color: primaryColor }} data-testid="text-about-title">
        <Info className="inline h-8 w-8 mr-2" style={{ color: accentColor }} />
        {page?.title || "About Us"}
      </h1>
      <div className="prose prose-lg max-w-none">
        {content.body ? (
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{content.body}</p>
        ) : (
          <div className="rounded-xl p-8 text-center" style={{ background: `linear-gradient(135deg, ${primaryColor}08, ${accentColor}08)` }}>
            <p className="text-gray-500">About page content can be managed from the admin CMS.</p>
          </div>
        )}
      </div>
    </div>
  );
}
