import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, Mail, MapPin } from "lucide-react";
import type { CmsPage, StoreSettings } from "@shared/schema";

export default function StoreContact() {
  const { data: page, isLoading } = useQuery<CmsPage>({ queryKey: ["/api/store/pages/contact"] });
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
      <h1 className="text-3xl font-bold mb-6" style={{ color: primaryColor }} data-testid="text-contact-title">
        <Phone className="inline h-8 w-8 mr-2" style={{ color: accentColor }} />
        {page?.title || "Contact Us"}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          {content.body && (
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{content.body}</p>
          )}
          <div className="space-y-4">
            {settings?.contactEmail && (
              <div className="flex items-center gap-3 p-4 rounded-xl border">
                <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accentColor}20` }}>
                  <Mail className="h-5 w-5" style={{ color: accentColor }} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-semibold" data-testid="text-contact-email">{settings.contactEmail}</p>
                </div>
              </div>
            )}
            {settings?.contactPhone && (
              <div className="flex items-center gap-3 p-4 rounded-xl border">
                <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accentColor}20` }}>
                  <Phone className="h-5 w-5" style={{ color: accentColor }} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-semibold" data-testid="text-contact-phone">{settings.contactPhone}</p>
                </div>
              </div>
            )}
            {settings?.contactAddress && (
              <div className="flex items-center gap-3 p-4 rounded-xl border">
                <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accentColor}20` }}>
                  <MapPin className="h-5 w-5" style={{ color: accentColor }} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-semibold" data-testid="text-contact-address">{settings.contactAddress}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="rounded-xl p-8 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${primaryColor}08, ${accentColor}08)` }}>
          <div className="text-center">
            <span className="text-6xl mb-4 block">💬</span>
            <p className="text-gray-600">Use the chat assistant for quick help!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
