export function formatDateDMY(dateString: string): string {
  if (!dateString) return "-";
  const parts = dateString.split("-");
  if (parts.length !== 3) return dateString;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

export function formatDateForInput(dateString: string): string {
  if (!dateString) return "";
  if (dateString.includes("/")) {
    const [day, month, year] = dateString.split("/");
    return `${year}-${month}-${day}`;
  }
  return dateString;
}

export function getTodayISO(): string {
  return new Date().toISOString().split("T")[0];
}
