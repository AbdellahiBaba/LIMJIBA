import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/language-context";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, AlertTriangle, Shield, Database, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Settings() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const restoreMutation = useMutation({
    mutationFn: async (data: object) => {
      const response = await apiRequest("POST", "/api/restore", data);
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries();
      toast({
        title: "Restauration terminee",
        description: `${result.imported} elements importes avec succes.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur de restauration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/backup", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Echec de l'export");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Export reussi",
        description: "La sauvegarde a ete telechargee.",
      });
    } catch (error) {
      toast({
        title: "Erreur d'export",
        description: error instanceof Error ? error.message : "Echec de l'export",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        restoreMutation.mutate(data);
      } catch (error) {
        toast({
          title: "Fichier invalide",
          description: "Le fichier n'est pas un fichier de sauvegarde valide.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (!user?.isAdmin) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Acces reserve aux administrateurs.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-settings-title">
          {t("settings.title") || "Parametres"}
        </h1>
        <p className="text-muted-foreground">
          {t("settings.description") || "Gestion des sauvegardes et configuration"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Sauvegarde des donnees
          </CardTitle>
          <CardDescription>
            Exportez vos donnees pour creer une sauvegarde ou restaurez a partir d'une sauvegarde precedente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={handleExport}
              disabled={isExporting}
              data-testid="button-export-backup"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Exporter la sauvegarde
            </Button>

            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="input-restore-file"
            />

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={restoreMutation.isPending}
                  data-testid="button-restore-backup"
                >
                  {restoreMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Restaurer une sauvegarde
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Confirmer la restauration
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    La restauration va importer les donnees du fichier de sauvegarde.
                    Les enregistrements existants avec les memes identifiants seront ignores.
                    Cette action ne peut pas etre annulee.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-confirm-restore"
                  >
                    Selectionner un fichier
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="p-4 bg-muted/50 rounded-md text-sm text-muted-foreground">
            <p className="font-medium mb-2">Contenu de la sauvegarde:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Produits et stock</li>
              <li>Factures et articles</li>
              <li>Ventes et tickets</li>
              <li>Clients et revendeurs</li>
              <li>Employes et salaires</li>
              <li>Depenses</li>
              <li>Factures de fabrication</li>
              <li>Paiements partiels</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Informations systeme
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Utilisateur connecte</p>
              <p className="font-medium">{user?.username}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Role</p>
              <p className="font-medium">{user?.isAdmin ? "Administrateur" : "Personnel"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Version</p>
              <p className="font-medium">1.0.0</p>
            </div>
            <div>
              <p className="text-muted-foreground">Base de donnees</p>
              <p className="font-medium">PostgreSQL (Neon)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
