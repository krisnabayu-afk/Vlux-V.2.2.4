import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(date) {
  if (!date) return "";
  
  // If it's a string and starts with YYYY-MM-DD, just take that part
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
    return date.split('T')[0];
  }
  
  const d = parseDate(date);
  if (!d) return "";
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDate(date) {
  if (!date) return null;
  if (date instanceof Date) return date;
  
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
    const [year, month, day] = date.split('T')[0].split('-').map(Number);
    // Create a new Date in the local timezone at midnight
    return new Date(year, month - 1, day);
  }
  
  const d = new Date(date);
  return isNaN(d.getTime()) ? null : d;
}
