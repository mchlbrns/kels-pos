export function getCurrencyCode(): 'PHP' | 'USD' {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('pos_currency');
    return saved === 'USD' ? 'USD' : 'PHP';
  }
  return 'PHP';
}

export function formatPrice(amount: number): string {
  const currency = getCurrencyCode();
  const locale = currency === 'USD' ? 'en-US' : 'en-PH';
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}