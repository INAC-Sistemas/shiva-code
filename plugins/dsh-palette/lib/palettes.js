// dsh-palette data and rules: the preset palettes the picker offers, and the
// validation of what the picker sends back. Node built-ins only, so the host
// and the tests share one copy; the client reads the presets over the API.

/** A 6-digit hex color, the only form a selection may carry. */
const HEX6 = /^#[0-9a-f]{6}$/i

/**
 * Normalize a hex color to `#RRGGBB` upper case.
 * @param value - `#RGB` or `#RRGGBB`, with or without `#`.
 * @returns the normalized hex, or undefined when it is not a hex color.
 */
export function normalizeHex(value) {
  if (typeof value !== 'string') return undefined
  let hex = value.trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(hex)) hex = hex.split('').map((c) => c + c).join('')
  if (!/^[0-9a-f]{6}$/i.test(hex)) return undefined
  return `#${hex.toUpperCase()}`
}

/** The five roles a picked palette is mapped to, in display order. */
export const ROLES = ['primary', 'secondary', 'accent', 'background', 'foreground']

/**
 * Curated preset palettes: five colors each, tagged for the picker's filters.
 * `tags` use the picker's categories: popular, pastel, escura, vibrante,
 * neutra, monocromatica.
 */
export const PRESET_PALETTES = [
  { id: 'oceano', name: 'Oceano', tags: ['popular'], colors: ['#03045E', '#0077B6', '#00B4D8', '#90E0EF', '#CAF0F8'] },
  { id: 'floresta', name: 'Floresta', tags: ['popular'], colors: ['#1B4332', '#2D6A4F', '#52B788', '#B7E4C7', '#F1FAEE'] },
  { id: 'por-do-sol', name: 'Pôr do sol', tags: ['popular', 'vibrante'], colors: ['#3D0C45', '#9D174D', '#F43F5E', '#FB923C', '#FDE68A'] },
  { id: 'terracota', name: 'Terracota', tags: ['popular'], colors: ['#2B1D14', '#9C4221', '#DD6B20', '#F6AD55', '#FFF5EB'] },
  { id: 'lavanda', name: 'Lavanda', tags: ['pastel'], colors: ['#2E1065', '#6D28D9', '#A78BFA', '#DDD6FE', '#F5F3FF'] },
  { id: 'menta', name: 'Menta', tags: ['pastel'], colors: ['#064E3B', '#0F766E', '#5EEAD4', '#CCFBF1', '#F0FDFA'] },
  { id: 'algodao-doce', name: 'Algodão-doce', tags: ['pastel'], colors: ['#831843', '#DB2777', '#F9A8D4', '#FCE7F3', '#FDF2F8'] },
  { id: 'pessego', name: 'Pêssego', tags: ['pastel'], colors: ['#7C2D12', '#EA580C', '#FDBA74', '#FFEDD5', '#FFF7ED'] },
  { id: 'meia-noite', name: 'Meia-noite', tags: ['escura', 'popular'], colors: ['#020617', '#0F172A', '#1E293B', '#38BDF8', '#E2E8F0'] },
  { id: 'carvao', name: 'Carvão', tags: ['escura', 'neutra'], colors: ['#0A0A0A', '#171717', '#404040', '#F59E0B', '#FAFAFA'] },
  { id: 'vinho', name: 'Vinho', tags: ['escura'], colors: ['#1C0A0F', '#4C0519', '#881337', '#F43F5E', '#FFE4E6'] },
  { id: 'noite-verde', name: 'Noite verde', tags: ['escura'], colors: ['#04130D', '#052E16', '#166534', '#4ADE80', '#DCFCE7'] },
  { id: 'neon', name: 'Neon', tags: ['vibrante'], colors: ['#0F0F1A', '#7C3AED', '#EC4899', '#22D3EE', '#FAFAFA'] },
  { id: 'tropical', name: 'Tropical', tags: ['vibrante', 'popular'], colors: ['#004D40', '#00A896', '#F9C80E', '#F86624', '#FFFBEB'] },
  { id: 'citrico', name: 'Cítrico', tags: ['vibrante'], colors: ['#1A2E05', '#65A30D', '#FACC15', '#FB923C', '#FEFCE8'] },
  { id: 'carnaval', name: 'Carnaval', tags: ['vibrante'], colors: ['#1E1B4B', '#E11D48', '#F59E0B', '#10B981', '#FFFFFF'] },
  { id: 'grafite', name: 'Grafite', tags: ['neutra', 'popular'], colors: ['#111827', '#374151', '#9CA3AF', '#E5E7EB', '#F9FAFB'] },
  { id: 'areia', name: 'Areia', tags: ['neutra'], colors: ['#3F3A33', '#78716C', '#D6CFC4', '#EFEBE4', '#FAF8F5'] },
  { id: 'papel', name: 'Papel', tags: ['neutra'], colors: ['#1C1917', '#57534E', '#A8A29E', '#E7E5E4', '#FFFFFF'] },
  { id: 'corporativo', name: 'Corporativo', tags: ['neutra', 'popular'], colors: ['#0B1F3A', '#1D4ED8', '#64748B', '#E2E8F0', '#FFFFFF'] },
  { id: 'azul-mono', name: 'Azul', tags: ['monocromatica'], colors: ['#172554', '#1E40AF', '#3B82F6', '#93C5FD', '#EFF6FF'] },
  { id: 'verde-mono', name: 'Verde', tags: ['monocromatica'], colors: ['#052E16', '#15803D', '#22C55E', '#86EFAC', '#F0FDF4'] },
  { id: 'vermelho-mono', name: 'Vermelho', tags: ['monocromatica'], colors: ['#450A0A', '#B91C1C', '#EF4444', '#FCA5A5', '#FEF2F2'] },
  { id: 'roxo-mono', name: 'Roxo', tags: ['monocromatica'], colors: ['#2E1065', '#6B21A8', '#A855F7', '#D8B4FE', '#FAF5FF'] },
  { id: 'laranja-mono', name: 'Laranja', tags: ['monocromatica'], colors: ['#431407', '#C2410C', '#F97316', '#FDBA74', '#FFF7ED'] },
  { id: 'rosa-mono', name: 'Rosa', tags: ['monocromatica'], colors: ['#500724', '#BE185D', '#EC4899', '#F9A8D4', '#FDF2F8'] },
  { id: 'amarelo-mono', name: 'Amarelo', tags: ['monocromatica'], colors: ['#422006', '#A16207', '#EAB308', '#FDE047', '#FEFCE8'] },
  { id: 'marrom-mono', name: 'Marrom', tags: ['monocromatica'], colors: ['#1C1410', '#5C4033', '#8B5E3C', '#C8A27C', '#F5EDE3'] },
  { id: 'saude', name: 'Saúde', tags: ['popular'], colors: ['#083344', '#0E7490', '#22D3EE', '#A5F3FC', '#F0FDFF'] },
  { id: 'financas', name: 'Finanças', tags: ['popular'], colors: ['#052E2B', '#047857', '#D4A017', '#D1FAE5', '#FFFFFF'] },
  { id: 'educacao', name: 'Educação', tags: ['vibrante'], colors: ['#1E1B4B', '#4F46E5', '#F59E0B', '#E0E7FF', '#FFFFFF'] },
  { id: 'cafe', name: 'Café', tags: ['escura'], colors: ['#1B130E', '#3E2A1F', '#7F5539', '#DDB892', '#F7EDE2'] },
]

/**
 * Validate what the picker sends back when the person confirms.
 * @param raw - `{ source, name, colors, roles }` from the client.
 * @returns the normalized selection.
 * @throws Error naming the first invalid field.
 */
export function assertSelection(raw) {
  const source = raw?.source
  if (!['preset', 'custom', 'suggestion', 'generated'].includes(source)) throw new Error('source inválido')
  const name = typeof raw.name === 'string' && raw.name.trim() !== '' ? raw.name.trim().slice(0, 80) : 'Personalizada'
  if (!Array.isArray(raw.colors) || raw.colors.length === 0 || raw.colors.length > 8) {
    throw new Error('colors deve ter de 1 a 8 cores')
  }
  const colors = raw.colors.map((value, index) => {
    const hex = normalizeHex(value)
    if (hex === undefined) throw new Error(`cor ${index + 1} não é um hex válido: ${JSON.stringify(value)}`)
    return hex
  })
  const roles = {}
  for (const role of ROLES) {
    const value = raw.roles?.[role]
    if (value === undefined || value === '') continue
    const hex = normalizeHex(value)
    if (hex === undefined) throw new Error(`o papel ${role} não é um hex válido: ${JSON.stringify(value)}`)
    roles[role] = hex
  }
  return { source, name, colors, roles }
}

/**
 * Validate the palettes the model proposes when it calls `palette_pick`.
 * @param raw - the tool's `suggestions` argument.
 * @returns the normalized suggestions; invalid entries are refused, not dropped.
 * @throws Error naming the first invalid suggestion.
 */
export function assertSuggestions(raw) {
  if (raw === undefined) return []
  if (!Array.isArray(raw) || raw.length > 8) throw new Error('suggestions deve ser uma lista de até 8 paletas')
  return raw.map((entry, index) => {
    const name = typeof entry?.name === 'string' && entry.name.trim() !== '' ? entry.name.trim().slice(0, 80) : undefined
    if (name === undefined) throw new Error(`suggestions[${index}].name é obrigatório`)
    if (!Array.isArray(entry.colors) || entry.colors.length < 2 || entry.colors.length > 8) {
      throw new Error(`suggestions[${index}].colors deve ter de 2 a 8 cores`)
    }
    const colors = entry.colors.map((value) => {
      const hex = normalizeHex(value)
      if (hex === undefined) throw new Error(`suggestions[${index}] tem uma cor inválida: ${JSON.stringify(value)}`)
      return hex
    })
    const note = typeof entry.note === 'string' ? entry.note.trim().slice(0, 200) : ''
    return { id: `sugestao-${index + 1}`, name, colors, note, tags: ['sugestao'] }
  })
}

/** Every preset color is a valid 6-digit hex; checked at load so a typo fails loud. */
for (const palette of PRESET_PALETTES) {
  for (const color of palette.colors) {
    if (!HEX6.test(color)) throw new Error(`dsh-palette: preset "${palette.id}" has an invalid color ${color}`)
  }
}
