import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Bell, Package, FileText, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Notification {
  id: string;
  type: "low_stock" | "overdue_invoice" | "credit_exceeded";
  severity: "critical" | "warning";
  title: string;
  message: string;
  date: string;
  link: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  count: number;
}

const DISMISSED_KEY = "dismissed-notifications";

function getDismissedIds(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function dismissId(id: string) {
  const ids = getDismissedIds();
  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
  }
}

function getIcon(type: string) {
  switch (type) {
    case "low_stock":
      return <Package className="h-4 w-4 text-orange-500 shrink-0" />;
    case "overdue_invoice":
      return <FileText className="h-4 w-4 text-red-500 shrink-0" />;
    case "credit_exceeded":
      return <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />;
    default:
      return <Bell className="h-4 w-4 shrink-0" />;
  }
}

export function NotificationCenter() {
  const [, setLocation] = useLocation();
  const [dismissedIds, setDismissedIds] = useState<string[]>(getDismissedIds);

  const { data } = useQuery<NotificationsResponse>({
    queryKey: ["/api/notifications"],
    refetchInterval: 60000,
  });

  const allNotifications = data?.notifications ?? [];
  const visibleNotifications = allNotifications.filter(
    (n) => !dismissedIds.includes(n.id)
  );
  const count = visibleNotifications.length;

  const handleDismiss = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    dismissId(id);
    setDismissedIds(getDismissedIds());
  }, []);

  const handleClick = useCallback(
    (link: string) => {
      setLocation(link);
    },
    [setLocation]
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="button-notification-bell"
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
            >
              {count}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b flex items-center justify-between gap-2">
          <h4 className="font-medium">Notifications</h4>
          {count > 0 && (
            <Badge variant="secondary" className="text-xs">
              {count}
            </Badge>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {count === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Aucune notification
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {visibleNotifications.map((notification) => (
                <div
                  key={notification.id}
                  data-testid={`notification-item-${notification.id}`}
                  className="flex items-start gap-2 p-2 rounded hover-elevate text-sm cursor-pointer"
                  onClick={() => handleClick(notification.link)}
                >
                  {getIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <p className="truncate font-medium">{notification.title}</p>
                      {notification.severity === "critical" && (
                        <Badge variant="destructive" className="text-[10px] px-1 py-0">
                          critical
                        </Badge>
                      )}
                      {notification.severity === "warning" && (
                        <Badge className="text-[10px] px-1 py-0 bg-orange-500 text-white border-orange-600">
                          warning
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {notification.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {notification.date}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 shrink-0"
                    onClick={(e) => handleDismiss(e, notification.id)}
                    data-testid={`button-dismiss-notification-${notification.id}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
