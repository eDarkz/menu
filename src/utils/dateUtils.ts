// Utility functions for date conversion between formats

// Convert Date to DD/M/YYYY format (API format)
export function dateToApiFormat(date: Date): string {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Convert YYYY-MM-DD format to DD/M/YYYY format
export function isoToApiFormat(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${day}/${month}/${year}`;
}

// Convert DD/M/YYYY format to YYYY-MM-DD format
export function apiToIsoFormat(apiDate: string): string {
  const [day, month, year] = apiDate.split('/').map(Number);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Convert DD/M/YYYY to Date object
export function apiFormatToDate(apiDate: string): Date {
  const [day, month, year] = apiDate.split('/').map(Number);
  return new Date(year, month - 1, day);
}

// Get today in DD/M/YYYY format
export function getTodayApiFormat(): string {
  return dateToApiFormat(new Date());
}

// Format date for display (e.g., "Lunes, 15 de Enero de 2024")
export function formatDateForDisplay(apiDate: string): string {
  const date = apiFormatToDate(apiDate);
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}