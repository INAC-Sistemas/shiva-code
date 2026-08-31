import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Helper padrão dos componentes Magic UI: junta classes condicionais (clsx) e
// resolve conflitos entre utilitários do Tailwind (tailwind-merge).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
