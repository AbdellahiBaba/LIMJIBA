import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatDateDMY } from "@/lib/dateUtils";
import { useLanguage } from "@/contexts/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  Users,
  Wallet,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportToCsv } from "@/lib/csv-export";
import type { Employee, InsertEmployee, SalaryPayment, InsertSalaryPayment, SalaryPaymentWithEmployee } from "@shared/schema";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("fr-DZ", {
    style: "currency",
    currency: "DZD",
    minimumFractionDigits: 2,
  }).format(amount);
};

const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
  onSuccess,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee;
  onSuccess: () => void;
  t: (key: string) => string;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<InsertEmployee>>({
    name: employee?.name ?? "",
    role: employee?.role ?? "",
    monthlySalary: employee?.monthlySalary ?? 0,
    phone: employee?.phone ?? "",
    email: employee?.email ?? "",
    isActive: employee?.isActive ?? true,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        name: employee?.name ?? "",
        role: employee?.role ?? "",
        monthlySalary: employee?.monthlySalary ?? 0,
        phone: employee?.phone ?? "",
        email: employee?.email ?? "",
        isActive: employee?.isActive ?? true,
      });
    }
  }, [open, employee]);

  const createMutation = useMutation({
    mutationFn: (data: InsertEmployee) => apiRequest("POST", "/api/employees", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: t("salaries.employeeAdded") });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: InsertEmployee) =>
      apiRequest("PATCH", `/api/employees/${employee?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: t("salaries.employeeUpdated") });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = formData as InsertEmployee;
    if (employee) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {employee ? t("salaries.editEmployee") : t("salaries.addEmployee")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {employee ? t("salaries.editEmployee") : t("salaries.addEmployee")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("salaries.employeeName")} *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t("salaries.employeeName")}
              required
              data-testid="input-employee-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">{t("salaries.role")}</Label>
            <Input
              id="role"
              value={formData.role ?? ""}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              placeholder={t("salaries.role")}
              data-testid="input-employee-role"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthlySalary">{t("salaries.monthlySalary")} (DZD)</Label>
            <Input
              id="monthlySalary"
              type="number"
              min="0"
              value={formData.monthlySalary}
              onChange={(e) =>
                setFormData({ ...formData, monthlySalary: parseFloat(e.target.value) || 0 })
              }
              data-testid="input-employee-salary"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">{t("salaries.phone")}</Label>
              <Input
                id="phone"
                value={formData.phone ?? ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+213..."
                data-testid="input-employee-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("salaries.email")}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email ?? ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
                data-testid="input-employee-email"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              data-testid="switch-employee-active"
            />
            <Label htmlFor="isActive">{t("salaries.active")}</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isPending} data-testid="button-save-employee">
              {isPending ? t("common.loading") : employee ? t("common.save") : t("salaries.addEmployee")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PaymentFormDialog({
  open,
  onOpenChange,
  employees,
  onSuccess,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  onSuccess: () => void;
  t: (key: string) => string;
}) {
  const { toast } = useToast();
  const currentDate = new Date();
  const [formData, setFormData] = useState<Partial<InsertSalaryPayment>>({
    employeeId: "",
    amount: 0,
    paymentDate: currentDate.toISOString().split("T")[0],
    month: String(currentDate.getMonth() + 1).padStart(2, "0"),
    year: currentDate.getFullYear(),
    notes: "",
  });

  useEffect(() => {
    if (open) {
      const now = new Date();
      setFormData({
        employeeId: "",
        amount: 0,
        paymentDate: now.toISOString().split("T")[0],
        month: String(now.getMonth() + 1).padStart(2, "0"),
        year: now.getFullYear(),
        notes: "",
      });
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: (data: InsertSalaryPayment) => apiRequest("POST", "/api/salary-payments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-payments"] });
      toast({ title: t("salaries.paymentAdded") });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const handleEmployeeChange = (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId);
    setFormData({
      ...formData,
      employeeId,
      amount: employee?.monthlySalary ?? 0,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData as InsertSalaryPayment);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("salaries.addPayment")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("salaries.addPayment")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("salaries.selectEmployee")} *</Label>
            <Select
              value={formData.employeeId}
              onValueChange={handleEmployeeChange}
            >
              <SelectTrigger data-testid="select-payment-employee">
                <SelectValue placeholder={t("salaries.selectEmployee")} />
              </SelectTrigger>
              <SelectContent>
                {employees.filter((e) => e.isActive).map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name} - {formatCurrency(emp.monthlySalary)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">{t("salaries.paymentAmount")} (DZD)</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
              }
              data-testid="input-payment-amount"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("salaries.paymentMonth")}</Label>
              <Select
                value={formData.month}
                onValueChange={(value) => setFormData({ ...formData, month: value })}
              >
                <SelectTrigger data-testid="select-payment-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">{t("salaries.paymentYear")}</Label>
              <Input
                id="year"
                type="number"
                min="2020"
                max="2030"
                value={formData.year}
                onChange={(e) =>
                  setFormData({ ...formData, year: parseInt(e.target.value) || currentDate.getFullYear() })
                }
                data-testid="input-payment-year"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentDate">{t("salaries.paymentDate")}</Label>
            <Input
              id="paymentDate"
              type="date"
              value={formData.paymentDate}
              onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              data-testid="input-payment-date"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">{t("salaries.notes")}</Label>
            <Textarea
              id="notes"
              value={formData.notes ?? ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={t("salaries.notes")}
              data-testid="input-payment-notes"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !formData.employeeId} data-testid="button-save-payment">
              {createMutation.isPending ? t("common.loading") : t("salaries.addPayment")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function SalariesPage() {
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>();
  const [deleteEmployeeDialogOpen, setDeleteEmployeeDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [deletePaymentDialogOpen, setDeletePaymentDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<SalaryPaymentWithEmployee | null>(null);

  const { data: employees = [], isLoading: loadingEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: payments = [], isLoading: loadingPayments } = useQuery<SalaryPaymentWithEmployee[]>({
    queryKey: ["/api/salary-payments"],
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/employees/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: t("salaries.employeeDeletedSuccess") });
      setDeleteEmployeeDialogOpen(false);
      setEmployeeToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/salary-payments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-payments"] });
      toast({ title: t("salaries.paymentDeletedSuccess") });
      setDeletePaymentDialogOpen(false);
      setPaymentToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: error.message || t("common.error"), variant: "destructive" });
    },
  });

  const handleDeleteEmployeeClick = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setDeleteEmployeeDialogOpen(true);
  };

  const confirmDeleteEmployee = () => {
    if (employeeToDelete) {
      deleteEmployeeMutation.mutate(employeeToDelete.id);
    }
  };

  const handleDeletePaymentClick = (payment: SalaryPaymentWithEmployee) => {
    setPaymentToDelete(payment);
    setDeletePaymentDialogOpen(true);
  };

  const confirmDeletePayment = () => {
    if (paymentToDelete) {
      deletePaymentMutation.mutate(paymentToDelete.id);
    }
  };

  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (emp.role?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalMonthlySalaries = employees
    .filter((e) => e.isActive)
    .reduce((sum, e) => sum + e.monthlySalary, 0);

  const activeEmployeesCount = employees.filter((e) => e.isActive).length;

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowEmployeeDialog(true);
  };

  const handleCloseEmployeeDialog = () => {
    setShowEmployeeDialog(false);
    setEditingEmployee(undefined);
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId);
    return employee?.name ?? "Unknown";
  };

  const getMonthName = (month: string) => {
    const monthObj = MONTHS.find((m) => m.value === month);
    return monthObj?.label ?? month;
  };

  return (
    <div className={`p-3 sm:p-6 space-y-4 sm:space-y-6 ${isRTL ? "rtl" : "ltr"}`} dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground" data-testid="text-page-title">
          {t("salaries.title")}
        </h1>
        <Button
          variant="outline"
          onClick={() => {
            exportToCsv(
              payments,
              [
                { header: t("salaries.employeeName"), accessor: (p) => p.employee?.name || getEmployeeName(p.employeeId) },
                { header: t("salaries.paymentAmount"), accessor: (p) => p.amount },
                { header: t("common.date"), accessor: (p) => p.paymentDate },
                { header: t("salaries.paymentMonth"), accessor: (p) => p.month },
                { header: t("salaries.paymentYear"), accessor: (p) => p.year },
                { header: t("common.notes"), accessor: (p) => p.notes },
              ],
              "salaires"
            );
          }}
          data-testid="button-export-csv"
        >
          <Download className="h-4 w-4 mr-2" />
          {t("common.exportCsv")}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("salaries.employees")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-employee-count">
              {activeEmployeesCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("salaries.active")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("salaries.totalSalaries")}
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-salaries">
              {formatCurrency(totalMonthlySalaries)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("salaries.monthlyTotal")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("salaries.payments")}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-payment-count">
              {payments.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("salaries.paymentHistory")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="employees" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="employees" data-testid="tab-employees">
            <Users className="h-4 w-4 mr-2" />
            {t("salaries.employees")}
          </TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">
            <DollarSign className="h-4 w-4 mr-2" />
            {t("salaries.payments")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("common.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-employees"
              />
            </div>
            <Button onClick={() => setShowEmployeeDialog(true)} data-testid="button-add-employee">
              <Plus className="h-4 w-4 mr-2" />
              {t("salaries.addEmployee")}
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {loadingEmployees ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium text-lg mb-1">{t("salaries.noEmployees")}</h3>
                  <p className="text-muted-foreground text-sm">{t("salaries.addEmployee")}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("salaries.employeeName")}</TableHead>
                      <TableHead>{t("salaries.role")}</TableHead>
                      <TableHead>{t("salaries.monthlySalary")}</TableHead>
                      <TableHead>{t("common.status")}</TableHead>
                      <TableHead className="text-right">{t("common.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee) => (
                      <TableRow key={employee.id} data-testid={`row-employee-${employee.id}`}>
                        <TableCell className="font-medium">{employee.name}</TableCell>
                        <TableCell>{employee.role || "-"}</TableCell>
                        <TableCell>{formatCurrency(employee.monthlySalary)}</TableCell>
                        <TableCell>
                          <Badge variant={employee.isActive ? "default" : "secondary"}>
                            {employee.isActive ? t("salaries.active") : t("salaries.inactive")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEditEmployee(employee)}
                              data-testid={`button-edit-employee-${employee.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteEmployeeClick(employee)}
                              data-testid={`button-delete-employee-${employee.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="flex flex-wrap items-center justify-end gap-4">
            <Button onClick={() => setShowPaymentDialog(true)} data-testid="button-add-payment">
              <Plus className="h-4 w-4 mr-2" />
              {t("salaries.addPayment")}
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {loadingPayments ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-12">
                  <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium text-lg mb-1">{t("salaries.noPayments")}</h3>
                  <p className="text-muted-foreground text-sm">{t("salaries.addPayment")}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("salaries.employeeName")}</TableHead>
                      <TableHead>{t("salaries.paymentMonth")}</TableHead>
                      <TableHead>{t("salaries.paymentYear")}</TableHead>
                      <TableHead>{t("salaries.paymentAmount")}</TableHead>
                      <TableHead>{t("salaries.paymentDate")}</TableHead>
                      <TableHead className="text-right">{t("common.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                        <TableCell className="font-medium">
                          {payment.employee?.name ?? getEmployeeName(payment.employeeId)}
                        </TableCell>
                        <TableCell>{getMonthName(payment.month)}</TableCell>
                        <TableCell>{payment.year}</TableCell>
                        <TableCell>{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>{formatDateDMY(payment.paymentDate)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeletePaymentClick(payment)}
                            data-testid={`button-delete-payment-${payment.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EmployeeFormDialog
        open={showEmployeeDialog}
        onOpenChange={handleCloseEmployeeDialog}
        employee={editingEmployee}
        onSuccess={handleCloseEmployeeDialog}
        t={t}
      />

      <PaymentFormDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        employees={employees}
        onSuccess={() => setShowPaymentDialog(false)}
        t={t}
      />

      <Dialog open={deleteEmployeeDialogOpen} onOpenChange={setDeleteEmployeeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("common.confirmDelete")}</DialogTitle>
            <DialogDescription>
              {t("salaries.confirmDeleteEmployee")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteEmployeeDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteEmployee}
              disabled={deleteEmployeeMutation.isPending}
              data-testid="button-confirm-delete-employee"
            >
              {deleteEmployeeMutation.isPending ? t("common.loading") : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deletePaymentDialogOpen} onOpenChange={setDeletePaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("common.confirmDelete")}</DialogTitle>
            <DialogDescription>
              {t("salaries.confirmDeletePayment")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePaymentDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeletePayment}
              disabled={deletePaymentMutation.isPending}
              data-testid="button-confirm-delete-payment"
            >
              {deletePaymentMutation.isPending ? t("common.loading") : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
