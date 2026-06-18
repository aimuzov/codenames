/** Маркер найденного слова: галочка в тонком кольце. По умолчанию наследует цвет текста. */
export function WordToken({ color = 'currentColor', size = 14 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 13 13" style={{ display: 'block' }}>
      <circle cx="6.5" cy="6.5" r="6" fill="none" stroke={color} strokeWidth="1.3" opacity="0.5" />
      <path
        d="M3.7 6.6 5.7 8.6 9.5 4.2"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
