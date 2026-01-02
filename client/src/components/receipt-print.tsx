import { useRef, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage, useBranding } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Printer, X, Loader2 } from "lucide-react";
import type { Sale, SaleItem } from "@shared/schema";

interface ReceiptPrintProps {
  saleId: string;
  open: boolean;
  onClose: () => void;
}

interface SaleWithItems extends Sale {
  items: SaleItem[];
}

export function ReceiptPrintDialog({ saleId, open, onClose }: ReceiptPrintProps) {
  const { t } = useLanguage();
  const { branding } = useBranding();
  const printRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const { data: sale, isLoading } = useQuery<SaleWithItems>({
    queryKey: [`/api/sales/${saleId}`],
    enabled: open && !!saleId,
  });

  const formatDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const paymentLabels: Record<string, string> = {
    'CASH': 'Especes',
    'CARD': 'Carte',
    'CREDIT': 'Credit',
    'TRANSFER': 'Virement'
  };

  const statusLabels: Record<string, string> = {
    'completed': 'Paye',
    'credit': 'Credit',
    'pending': 'En attente'
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    
    setIsPrinting(true);
    
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    
    if (!printWindow) {
      setIsPrinting(false);
      return;
    }

    const primaryColor = branding?.primaryColor || '#1976D2';
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Ticket - ${sale?.saleNumber || ''}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', 'Roboto', -apple-system, sans-serif; 
            font-size: 11px; 
            width: 80mm; 
            margin: 0 auto; 
            padding: 10px;
            background: #fff;
            color: #333;
          }
          .header { 
            text-align: center; 
            padding-bottom: 14px; 
            margin-bottom: 12px;
            border-bottom: 3px solid ${primaryColor};
          }
          .logo-container { margin-bottom: 10px; }
          .logo { max-width: 70px; max-height: 70px; object-fit: contain; }
          .company-name { 
            font-size: 20px; 
            font-weight: 800;
            color: ${primaryColor};
            letter-spacing: 0.5px;
            margin-bottom: 6px;
            text-transform: uppercase;
          }
          .company-info { font-size: 9px; color: #666; line-height: 1.5; }
          .company-phone { font-size: 12px; font-weight: 700; color: ${primaryColor}; margin-top: 6px; }
          .receipt-title {
            text-align: center;
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
            padding: 8px 0;
            background: linear-gradient(135deg, ${primaryColor}20, ${primaryColor}10);
            margin: 10px 0;
            border-radius: 6px;
            color: ${primaryColor};
          }
          .info { 
            margin-bottom: 12px;
            padding: 10px 12px;
            background: #f8f9fa;
            border-radius: 6px;
            border-left: 3px solid ${primaryColor};
          }
          .info-row { 
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 4px 0;
            font-size: 10px;
          }
          .info-label { color: #666; font-weight: 500; }
          .info-value { font-weight: 600; color: #333; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0; }
          th { 
            font-size: 9px;
            text-transform: uppercase;
            color: #888;
            border-bottom: 2px solid #eee;
            padding: 8px 4px;
            text-align: left;
            font-weight: 600;
            letter-spacing: 0.5px;
          }
          th:last-child { text-align: right; }
          td { 
            padding: 8px 4px;
            border-bottom: 1px dashed #e0e0e0;
            vertical-align: middle;
            font-size: 11px;
          }
          td:last-child { text-align: right; font-weight: 600; font-family: 'Consolas', monospace; }
          .item-name { font-weight: 600; color: #333; }
          .item-qty { color: #888; font-size: 9px; font-family: 'Consolas', monospace; }
          .totals {
            background: linear-gradient(135deg, ${primaryColor}15, ${primaryColor}05);
            border-radius: 8px;
            padding: 12px;
            margin-top: 12px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 5px 0;
            font-size: 11px;
          }
          .totals-row span:last-child { font-family: 'Consolas', monospace; font-weight: 600; }
          .totals-row.discount { color: #4caf50; }
          .totals-row.grand-total {
            font-size: 18px;
            font-weight: 800;
            color: ${primaryColor};
            border-top: 2px dashed ${primaryColor}40;
            padding-top: 10px;
            margin-top: 8px;
          }
          .status-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .status-completed { background: #e8f5e9; color: #2e7d32; }
          .status-credit { background: #fff3e0; color: #e65100; }
          .status-pending { background: #f5f5f5; color: #616161; }
          .footer { 
            text-align: center; 
            margin-top: 18px;
            padding-top: 14px;
            border-top: 2px dashed #ddd;
          }
          .footer-thanks { font-size: 14px; font-weight: 700; color: ${primaryColor}; margin-bottom: 6px; }
          .footer-msg { font-size: 10px; color: #888; font-style: italic; }
          .receipt-number {
            text-align: center;
            font-size: 9px;
            color: #aaa;
            margin-top: 12px;
            padding: 6px;
            background: #f5f5f5;
            border-radius: 4px;
            font-family: 'Consolas', monospace;
          }
          @media print { 
            body { width: 80mm; padding: 5mm; }
          }
        </style>
      </head>
      <body>
        ${printContent}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }, 100);
          };
        </script>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    setIsPrinting(false);
    onClose();
  };

  if (!open) return null;

  const companyName = 'POLY FLECTA PLASTICA';
  const address = '';
  const phone = '';
  const logo = branding?.logo;
  const primaryColor = branding?.primaryColor || '#1976D2';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("pos.printReceipt")}</DialogTitle>
          <DialogDescription className="sr-only">
            Preview and print the sale receipt
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : sale ? (
          <div 
            ref={printRef}
            className="bg-white text-black p-4 rounded-lg border text-sm"
            style={{ fontFamily: "'Segoe UI', Roboto, sans-serif" }}
          >
            <div className="header text-center pb-3 mb-3 border-b-2" style={{ borderColor: primaryColor }}>
              {logo && (
                <div className="logo-container mb-2">
                  <img src={logo} alt="Logo" className="max-w-[60px] max-h-[60px] mx-auto object-contain" />
                </div>
              )}
              <div className="company-name text-lg font-bold uppercase" style={{ color: primaryColor }}>
                {companyName}
              </div>
              {address && <div className="company-info text-xs text-gray-600">{address}</div>}
              {phone && <div className="company-phone text-sm font-semibold mt-1" style={{ color: primaryColor }}>{phone}</div>}
            </div>

            <div className="receipt-title text-center font-bold uppercase tracking-wider py-2 rounded mb-3" 
                 style={{ background: `linear-gradient(135deg, ${primaryColor}20, ${primaryColor}10)`, color: primaryColor }}>
              TICKET DE CAISSE
            </div>

            <div className="info p-2 mb-3 rounded" style={{ background: '#f8f9fa', borderLeft: `3px solid ${primaryColor}` }}>
              <div className="info-row flex justify-between text-xs mb-1">
                <span className="text-gray-600">N:</span>
                <span className="font-semibold">{sale.saleNumber}</span>
              </div>
              <div className="info-row flex justify-between text-xs mb-1">
                <span className="text-gray-600">Date:</span>
                <span className="font-semibold">{formatDate(sale.date)}</span>
              </div>
              <div className="info-row flex justify-between text-xs mb-1">
                <span className="text-gray-600">Paiement:</span>
                <span className="font-semibold">{paymentLabels[sale.paymentMode] || sale.paymentMode}</span>
              </div>
              <div className="info-row flex justify-between text-xs">
                <span className="text-gray-600">Statut:</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  sale.status === 'completed' ? 'bg-green-100 text-green-700' :
                  sale.status === 'credit' ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {statusLabels[sale.status] || sale.status}
                </span>
              </div>
            </div>

            <table className="w-full text-xs mb-3">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-2 text-gray-500 uppercase tracking-wide">Article</th>
                  <th className="text-right py-2 text-gray-500 uppercase tracking-wide">Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.items?.map((item, index) => (
                  <tr key={index} className="border-b border-dashed border-gray-200">
                    <td className="py-2">
                      <div className="font-semibold">{item.productName}</div>
                      <div className="text-gray-500" style={{ fontFamily: 'Consolas, monospace' }}>
                        {Number(item.unitPrice).toLocaleString()} x {item.quantity}
                      </div>
                    </td>
                    <td className="py-2 text-right font-semibold" style={{ fontFamily: 'Consolas, monospace' }}>
                      {Number(item.total).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="totals p-3 rounded-lg" style={{ background: `linear-gradient(135deg, ${primaryColor}15, ${primaryColor}05)` }}>
              {Number(sale.discount) > 0 && (
                <div className="totals-row flex justify-between text-green-600 text-xs mb-1">
                  <span>Remise</span>
                  <span style={{ fontFamily: 'Consolas, monospace' }}>-{Number(sale.discount).toLocaleString()} DZD</span>
                </div>
              )}
              <div className="totals-row grand-total flex justify-between text-lg font-bold pt-2 mt-2" 
                   style={{ color: primaryColor, borderTop: `2px dashed ${primaryColor}40` }}>
                <span>TOTAL</span>
                <span style={{ fontFamily: 'Consolas, monospace' }}>{Number(sale.total).toLocaleString()} DZD</span>
              </div>
            </div>

            <div className="footer text-center mt-4 pt-3 border-t-2 border-dashed border-gray-300">
              <div className="footer-thanks text-sm font-bold" style={{ color: primaryColor }}>
                Merci pour votre achat!
              </div>
              <div className="footer-msg text-xs text-gray-500 italic">
                A bientot
              </div>
            </div>

            <div className="receipt-number text-center text-xs text-gray-400 mt-3 py-1 bg-gray-100 rounded" style={{ fontFamily: 'Consolas, monospace' }}>
              {sale.saleNumber}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Receipt not found
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            {t("common.cancel")}
          </Button>
          <Button onClick={handlePrint} disabled={isLoading || !sale || isPrinting}>
            {isPrinting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Printer className="h-4 w-4 mr-2" />
            )}
            {t("pos.printReceipt")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
