import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, User, Package, Shield, Boxes, Factory, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import defaultLogoImg from "@assets/logo.png";

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

  const floatingIcons = [
    { Icon: Boxes, delay: 0, x: "10%", y: "20%" },
    { Icon: Package, delay: 0.5, x: "85%", y: "15%" },
    { Icon: Factory, delay: 1, x: "15%", y: "75%" },
    { Icon: Truck, delay: 1.5, x: "80%", y: "70%" },
    { Icon: Boxes, delay: 2, x: "50%", y: "10%" },
    { Icon: Package, delay: 2.5, x: "5%", y: "45%" },
  ];

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A1628] via-[#0D1520] to-[#060B14]" />
      
      <div className="absolute inset-0">
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%)",
            top: "-200px",
            right: "-200px",
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)",
            bottom: "-150px",
            left: "-150px",
          }}
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {floatingIcons.map(({ Icon, delay, x, y }, index) => (
        <motion.div
          key={index}
          className="absolute"
          style={{ left: x, top: y, color: "rgba(201,168,76,0.08)" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ 
            opacity: [0.05, 0.15, 0.05],
            y: [0, -20, 0],
            rotate: [0, 10, 0],
          }}
          transition={{
            duration: 6,
            delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Icon className="w-16 h-16" />
        </motion.div>
      ))}

      <motion.div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent)" }}
        animate={{
          x: ["-100%", "100%"],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.div 
            className="inline-flex items-center justify-center p-5 rounded-2xl mb-6 border shadow-2xl"
            style={{ background: "rgba(201,168,76,0.08)", borderColor: "rgba(201,168,76,0.2)", backdropFilter: "blur(12px)" }}
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, delay: 0.2, type: "spring" }}
            whileHover={{ scale: 1.05, rotate: 5 }}
          >
            <img 
              src={branding.logo || defaultLogoImg} 
              alt={t("company.name")} 
              className="h-20 w-auto rounded-lg"
            />
          </motion.div>
          
          <motion.h1 
            className="text-4xl font-bold text-white mb-3 tracking-tight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, #C9A84C, #E8D5A0, #C9A84C)" }}>
              LIMJIBA
            </span>
          </motion.h1>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <p className="text-lg font-light" style={{ color: "rgba(201,168,76,0.7)" }}>
              {isRTL ? "نظام إدارة لمجيبة" : "E-Commerce Manager"}
            </p>
            <div className="flex items-center justify-center gap-2 mt-2 text-sm" style={{ color: "rgba(201,168,76,0.4)" }}>
              <Boxes className="w-4 h-4" />
              <span>{isRTL ? "إدارة المتجر والمبيعات" : "Store & Sales Management"}</span>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="rounded-2xl shadow-2xl overflow-hidden border" style={{ background: "rgba(250,246,238,0.97)", borderColor: "rgba(201,168,76,0.15)" }}>
            <div className="h-1.5" style={{ background: "linear-gradient(90deg, #C9A84C, #E8D5A0, #C9A84C)" }} />
            
            <div className="p-8">
              <motion.div 
                className="flex items-center justify-center gap-2 mb-6"
                style={{ color: "#0A1628" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Shield className="h-5 w-5" style={{ color: "#C9A84C" }} />
                <span className="font-semibold text-sm uppercase tracking-wide">
                  {isRTL ? "تسجيل الدخول الآمن" : "Connexion Sécurisée"}
                </span>
              </motion.div>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Label htmlFor="username" className="text-sm font-medium" style={{ color: "#0A1628" }}>
                    {isRTL ? "اسم المستخدم" : "Identifiant"}
                  </Label>
                  <div className="relative group">
                    <User className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${isRTL ? 'right-4' : 'left-4'}`} style={{ color: "#C9A84C" }} />
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={isRTL ? "أدخل اسم المستخدم" : "Entrez votre identifiant"}
                      className={`h-12 text-base border-2 rounded-xl transition-all duration-300 focus:shadow-lg ${isRTL ? 'pr-12' : 'pl-12'}`}
                      style={{ borderColor: "rgba(201,168,76,0.2)", background: "rgba(250,246,238,0.5)" }}
                      data-testid="input-username"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </motion.div>
                
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <Label htmlFor="password" className="text-sm font-medium" style={{ color: "#0A1628" }}>
                    {isRTL ? "كلمة المرور" : "Mot de passe"}
                  </Label>
                  <div className="relative group">
                    <Lock className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${isRTL ? 'right-4' : 'left-4'}`} style={{ color: "#C9A84C" }} />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isRTL ? "أدخل كلمة المرور" : "Entrez votre mot de passe"}
                      className={`h-12 text-base border-2 rounded-xl transition-all duration-300 focus:shadow-lg ${isRTL ? 'pr-12' : 'pl-12'}`}
                      style={{ borderColor: "rgba(201,168,76,0.2)", background: "rgba(250,246,238,0.5)" }}
                      data-testid="input-password"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </motion.div>
                
                {error && (
                  <motion.div 
                    className="p-3 rounded-xl bg-red-50 border border-red-200"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <p className="text-sm text-red-600 text-center" data-testid="text-login-error">
                      {(() => {
                        const e = error.toLowerCase();
                        return (e.includes("database") || e.includes("service") || e.includes("capacity") || e.includes("unavailable") || e.includes("500") || e.includes("network") || e.includes("fetch"))
                          ? (isRTL ? "خطأ في الخادم. يرجى المحاولة لاحقاً" : "Erreur de connexion au serveur. Réessayez plus tard.")
                          : (isRTL ? "اسم المستخدم أو كلمة المرور غير صحيحة" : "Identifiant ou mot de passe incorrect");
                      })()}
                    </p>
                  </motion.div>
                )}
                
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-semibold transition-all duration-300 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    style={{ background: "linear-gradient(135deg, #0A1628, #152238)", color: "#C9A84C" }}
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
                </motion.div>
              </form>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <div className="flex items-center justify-center gap-4 text-xs mb-3" style={{ color: "rgba(201,168,76,0.5)" }}>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "#C9A84C" }} />
              <span>{isRTL ? "نظام آمن" : "Système Sécurisé"}</span>
            </div>
            <span style={{ color: "rgba(201,168,76,0.2)" }}>|</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#C9A84C" }} />
              <span>{isRTL ? "متصل" : "En ligne"}</span>
            </div>
          </div>
          <p className="text-xs" style={{ color: "rgba(201,168,76,0.3)" }}>
            © {new Date().getFullYear()} LIMJIBA - {isRTL ? "جميع الحقوق محفوظة" : "All rights reserved"}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
