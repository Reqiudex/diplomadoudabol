/**
 * Utilidades de normalización y formateo numérico / monetario
 * Diseñado para manejar con resiliencia valores de la API:
 * - Decimals serializados como string (ej: "45.00")
 * - Números nativos (ej: 45.00)
 * - Valores nulos, indefinidos o vacíos
 * - Cadenas inválidas
 */

/**
 * Convierte cualquier entrada a un número seguro de punto flotante.
 * Retorna fallback (por defecto 0) si es nulo, indefinido o NaN.
 */
export function toNumber(value: unknown, fallback: number = 0): number {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === 'string') {
    const cleaned = value.trim().replace(',', '.');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

/**
 * Formatea un valor como moneda consistente (ej: "$45.00").
 * Si el valor no es numérico válido, retorna "$0.00" o un fallback seguro.
 */
export function formatCurrency(value: unknown, currencySymbol: string = '$'): string {
  const num = toNumber(value, 0);
  return `${currencySymbol}${num.toFixed(2)}`;
}

/**
 * Formatea un número con decimales especificados sin lanzar TypeError.
 */
export function formatNumber(value: unknown, decimals: number = 2): string {
  const num = toNumber(value, 0);
  return num.toFixed(decimals);
}
