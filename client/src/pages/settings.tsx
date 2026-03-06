import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/language-context";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, AlertTriangle, Shield, Database, Loader2, Users, Plus, Pencil, Trash2, UserCheck, UserX } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ALL_PERMISSIONS, type User as SchemaUser } from "@shared/schema";

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
      const now = new Date().toISOString();
      localStorage.setItem("lastBackupDate", now);
      setLastBackupDate(now);
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

  const [restorePreview, setRestorePreview] = useState<Record<string, number> | null>(null);
  const [restoreData, setRestoreData] = useState<object | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(() => localStorage.getItem("lastBackupDate"));

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        const preview: Record<string, number> = {};
        for (const [key, val] of Object.entries(data)) {
          if (Array.isArray(val)) {
            preview[key] = val.length;
          }
        }
        setRestorePreview(preview);
        setRestoreData(data);
        setPreviewDialogOpen(true);
      } catch {
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

  const confirmRestore = () => {
    if (restoreData) {
      restoreMutation.mutate(restoreData);
      setPreviewDialogOpen(false);
      setRestorePreview(null);
      setRestoreData(null);
    }
  };

  if (!user?.isAdmin) {
    return (
      <div className="p-3 sm:p-6 flex items-center justify-center h-full">
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
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-settings-title">
          {t("settings.title")}
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
          {t("settings.description")}
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

            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
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
          </div>

          {lastBackupDate && (
            <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-md text-sm">
              <p className="font-medium text-green-700 dark:text-green-400">
                Dernière sauvegarde: {new Date(lastBackupDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          )}

          {!lastBackupDate && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-md text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Aucune sauvegarde récente détectée. Effectuez une sauvegarde régulière.
              </p>
            </div>
          )}

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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

      {user?.isAdmin && <UserManagementSection currentUserId={user.id} />}

      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Aperçu de la restauration
            </DialogTitle>
            <DialogDescription>
              Voici le contenu du fichier de sauvegarde. Confirmez pour importer ces données.
            </DialogDescription>
          </DialogHeader>
          {restorePreview && (
            <div className="rounded-md border p-4 space-y-2 text-sm max-h-60 overflow-y-auto">
              {Object.entries(restorePreview).map(([key, count]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="capitalize">{key.replace(/_/g, " ")}</span>
                  <Badge variant="secondary">{count} éléments</Badge>
                </div>
              ))}
              {Object.keys(restorePreview).length === 0 && (
                <p className="text-muted-foreground text-center py-2">Fichier vide ou format non reconnu</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPreviewDialogOpen(false); setRestorePreview(null); setRestoreData(null); }}>
              Annuler
            </Button>
            <Button onClick={confirmRestore} disabled={restoreMutation.isPending} data-testid="button-confirm-restore">
              {restoreMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Confirmer la restauration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface UserFormData {
  username: string;
  password: string;
  displayName: string;
  role: string;
  isAdmin: boolean;
  permissions: string[];
}

const defaultFormData: UserFormData = {
  username: "",
  password: "",
  displayName: "",
  role: "staff",
  isAdmin: false,
  permissions: [],
};

function UserManagementSection({ currentUserId }: { currentUserId: string }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SchemaUser | null>(null);
  const [formData, setFormData] = useState<UserFormData>(defaultFormData);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  const { data: usersList = [], isLoading } = useQuery<SchemaUser[]>({
    queryKey: ["/api/users"],
  });

  useEffect(() => {
    if (formData.isAdmin || formData.role === "admin") {
      setFormData((prev) => ({ ...prev, permissions: [...ALL_PERMISSIONS] }));
    }
  }, [formData.isAdmin, formData.role]);

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const response = await apiRequest("POST", "/api/users", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Utilisateur cree avec succes" });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const response = await apiRequest("PATCH", `/api/users/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Utilisateur mis a jour" });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Utilisateur supprime" });
      setDeleteUserId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/users/${id}`, { isActive });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Statut mis a jour" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditingUser(null);
    setFormData(defaultFormData);
  }

  function openCreateDialog() {
    setEditingUser(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  }

  function openEditDialog(u: SchemaUser) {
    setEditingUser(u);
    let perms: string[] = [];
    try {
      perms = JSON.parse(u.permissions || "[]");
    } catch { /* empty */ }
    setFormData({
      username: u.username,
      password: "",
      displayName: u.displayName || "",
      role: u.role,
      isAdmin: u.isAdmin,
      permissions: perms,
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!formData.username.trim()) {
      toast({ title: "Le nom d'utilisateur est requis", variant: "destructive" });
      return;
    }
    if (!editingUser && !formData.password.trim()) {
      toast({ title: "Le mot de passe est requis", variant: "destructive" });
      return;
    }

    const payload: Record<string, unknown> = {
      username: formData.username,
      isAdmin: formData.isAdmin,
      displayName: formData.displayName || null,
      role: formData.role,
      permissions: JSON.stringify(formData.permissions),
    };
    if (formData.password) {
      payload.password = formData.password;
    }

    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function togglePermission(perm: string) {
    if (formData.isAdmin || formData.role === "admin") return;
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }));
  }

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gestion des Utilisateurs
              </CardTitle>
              <CardDescription>Gerez les comptes utilisateurs et leurs permissions.</CardDescription>
            </div>
            <Button onClick={openCreateDialog} data-testid="button-create-user">
              <Plus className="h-4 w-4 mr-2" />
              Creer un utilisateur
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom d'utilisateur</TableHead>
                    <TableHead>Nom d'affichage</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Actif</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersList.map((u) => {
                    let perms: string[] = [];
                    try { perms = JSON.parse(u.permissions || "[]"); } catch { /* empty */ }
                    return (
                      <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                        <TableCell className="font-medium" data-testid={`text-username-${u.id}`}>
                          {u.username}
                          {u.isAdmin && <Badge variant="secondary" className="ml-2">Admin</Badge>}
                        </TableCell>
                        <TableCell data-testid={`text-displayname-${u.id}`}>{u.displayName || "-"}</TableCell>
                        <TableCell data-testid={`text-role-${u.id}`}>{u.role}</TableCell>
                        <TableCell data-testid={`text-active-${u.id}`}>
                          <Badge variant={u.isActive ? "default" : "secondary"}>
                            {u.isActive ? "Actif" : "Inactif"}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`text-permissions-${u.id}`}>
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {u.isAdmin ? (
                              <Badge variant="outline" className="text-xs">Toutes</Badge>
                            ) : perms.length > 0 ? (
                              perms.slice(0, 3).map((p) => (
                                <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-xs">Aucune</span>
                            )}
                            {!u.isAdmin && perms.length > 3 && (
                              <Badge variant="outline" className="text-xs">+{perms.length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEditDialog(u)}
                              data-testid={`button-edit-user-${u.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {u.id !== currentUserId && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => toggleActiveMutation.mutate({ id: u.id, isActive: !u.isActive })}
                                  data-testid={`button-toggle-active-${u.id}`}
                                >
                                  {u.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setDeleteUserId(u.id)}
                                  data-testid={`button-delete-user-${u.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {usersList.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Aucun utilisateur trouve.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-user-dialog-title">
              {editingUser ? "Modifier l'utilisateur" : "Creer un utilisateur"}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? "Modifiez les informations de l'utilisateur." : "Remplissez les informations pour creer un nouveau compte."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-username">Nom d'utilisateur *</Label>
              <Input
                id="user-username"
                value={formData.username}
                onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                data-testid="input-user-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-password">
                Mot de passe {editingUser ? "(laisser vide pour ne pas changer)" : "*"}
              </Label>
              <Input
                id="user-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                data-testid="input-user-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-displayname">Nom d'affichage</Label>
              <Input
                id="user-displayname"
                value={formData.displayName}
                onChange={(e) => setFormData((prev) => ({ ...prev, displayName: e.target.value }))}
                data-testid="input-user-displayname"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, role: value }))}
              >
                <SelectTrigger data-testid="select-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="user-isadmin"
                checked={formData.isAdmin}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isAdmin: checked === true }))
                }
                data-testid="checkbox-user-isadmin"
              />
              <Label htmlFor="user-isadmin">Administrateur</Label>
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              {(formData.isAdmin || formData.role === "admin") && (
                <p className="text-xs text-muted-foreground">Toutes les permissions sont accordees automatiquement.</p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ALL_PERMISSIONS.map((perm) => (
                  <div key={perm} className="flex items-center gap-2">
                    <Checkbox
                      id={`perm-${perm}`}
                      checked={formData.permissions.includes(perm)}
                      disabled={formData.isAdmin || formData.role === "admin"}
                      onCheckedChange={() => togglePermission(perm)}
                      data-testid={`checkbox-perm-${perm}`}
                    />
                    <Label htmlFor={`perm-${perm}`} className="text-xs cursor-pointer">
                      {perm}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} data-testid="button-cancel-user">
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={isMutating} data-testid="button-submit-user">
              {isMutating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingUser ? "Mettre a jour" : "Creer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteUserId} onOpenChange={(open) => { if (!open) setDeleteUserId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmer la suppression
            </AlertDialogTitle>
            <AlertDialogDescription>
              Etes-vous sur de vouloir supprimer cet utilisateur ? Cette action est irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-user">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserId && deleteMutation.mutate(deleteUserId)}
              data-testid="button-confirm-delete-user"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
