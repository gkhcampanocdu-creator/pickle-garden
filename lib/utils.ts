export function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function h12(h: number): string {
  return `${h % 12 || 12}:00 ${h < 12 ? 'AM' : 'PM'}`
}
