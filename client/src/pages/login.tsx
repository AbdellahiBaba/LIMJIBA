import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, User, Package, Shield } from "lucide-react";
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
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#0D47A1] via-[#1976D2] to-[#1565C0]" />
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-64 h-64 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-white rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white rounded-full blur-3xl opacity-5" />
      </div>
      
      <div className="relative z-10 w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-white/10 backdrop-blur-sm rounded-2xl mb-6 border border-white/20">
            {branding.logo ? (
              <img 
                src={branding.logo} 
                alt={t("company.name")} 
                className="h-16 w-auto"
              />
            ) : (
              <Package className="h-12 w-12 text-white" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            POLY FLECTA PLASTICA
          </h1>
          <p className="text-blue-100 text-lg">
            {isRTL ? "نظام إدارة الأعمال المتكامل" : "Système de Gestion Intégré"}
          </p>
        </div>

        <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="flex items-center justify-center gap-2 mb-6 text-[#1976D2]">
              <Shield className="h-5 w-5" />
              <span className="font-medium">
                {isRTL ? "تسجيل الدخول الآمن" : "Connexion Sécurisée"}
              </span>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-[#546E7A]">
                  {isRTL ? "اسم المستخدم" : "Identifiant"}
                </Label>
                <div className="relative">
                  <User className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 text-[#90A4AE] ${isRTL ? 'right-4' : 'left-4'}`} />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={isRTL ? "أدخل اسم المستخدم" : "Entrez votre identifiant"}
                    className={`h-12 text-base border-2 border-gray-200 focus:border-[#1976D2] bg-gray-50/50 ${isRTL ? 'pr-12' : 'pl-12'}`}
                    data-testid="input-username"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-[#546E7A]">
                  {isRTL ? "كلمة المرور" : "Mot de passe"}
                </Label>
                <div className="relative">
                  <Lock className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 text-[#90A4AE] ${isRTL ? 'right-4' : 'left-4'}`} />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isRTL ? "أدخل كلمة المرور" : "Entrez votre mot de passe"}
                    className={`h-12 text-base border-2 border-gray-200 focus:border-[#1976D2] bg-gray-50/50 ${isRTL ? 'pr-12' : 'pl-12'}`}
                    data-testid="input-password"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-600 text-center" data-testid="text-login-error">
                    {isRTL ? "اسم المستخدم أو كلمة المرور غير صحيحة" : "Identifiant ou mot de passe incorrect"}
                  </p>
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-medium bg-[#1976D2] hover:bg-[#1565C0] transition-all duration-200"
                disabled={isLoading || !username || !password}
                data-testid="button-login"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {isRTL ? "جاري الدخول..." : "Connexion en cours..."}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    {isRTL ? "تسجيل الدخول" : "Se connecter"}
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-blue-100 text-sm">
            {isRTL ? "صناعة التغليف البلاستيكي الصناعي" : "Fabrication d'Emballages Plastiques Industriels"}
          </p>
          <p className="text-blue-200/70 text-xs mt-2">
            {isRTL ? "جميع الحقوق محفوظة" : "Tous droits réservés"} © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
