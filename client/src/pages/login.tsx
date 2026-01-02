import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, User, Factory } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading, error } = useAuth();
  const { t, branding, language } = useLanguage();
  const { toast } = useToast();
  const isRTL = language === "ar";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(username, password);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: isRTL ? "خطأ في تسجيل الدخول" : "Erreur de connexion",
        description: err.message || (isRTL ? "اسم المستخدم أو كلمة المرور غير صحيحة" : "Identifiant ou mot de passe incorrect"),
      });
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 p-4"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex flex-col items-center gap-4">
            {branding.logo ? (
              <img 
                src={branding.logo} 
                alt={t("company.name")} 
                className="h-16 w-auto"
              />
            ) : (
              <div className="p-4 bg-primary/10 rounded-full">
                <Factory className="h-10 w-10 text-primary" />
              </div>
            )}
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">
                {t("company.name")}
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-1">
                {isRTL ? "نظام إدارة الأعمال" : "Système de Gestion"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                {isRTL ? "اسم المستخدم" : "Identifiant"}
              </Label>
              <div className="relative">
                <User className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={isRTL ? "أدخل اسم المستخدم" : "Entrez votre identifiant"}
                  className={isRTL ? 'pr-10' : 'pl-10'}
                  data-testid="input-username"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                {isRTL ? "كلمة المرور" : "Mot de passe"}
              </Label>
              <div className="relative">
                <Lock className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isRTL ? "أدخل كلمة المرور" : "Entrez votre mot de passe"}
                  className={isRTL ? 'pr-10' : 'pl-10'}
                  data-testid="input-password"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            {error && (
              <p className="text-sm text-destructive text-center" data-testid="text-login-error">
                {isRTL ? "اسم المستخدم أو كلمة المرور غير صحيحة" : "Identifiant ou mot de passe incorrect"}
              </p>
            )}
            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading || !username || !password}
              data-testid="button-login"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isRTL ? "جاري الدخول..." : "Connexion..."}
                </>
              ) : (
                isRTL ? "تسجيل الدخول" : "Se connecter"
              )}
            </Button>
          </form>
          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-xs text-muted-foreground">
              {isRTL ? "جميع الحقوق محفوظة" : "Tous droits réservés"} &copy; {new Date().getFullYear()}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
