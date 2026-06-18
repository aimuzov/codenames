import QRCode from 'react-qr-code'

/** Показывает строку как QR-код — его сканирует камера другого игрока. */
export function QrCode({ value }: { value: string }) {
  return (
    // QR всегда на белом фоне — встроенный сканер (zxing) читает только
    // тёмные модули на светлом. Цвета настроим отдельным шагом.
    <div className="mx-auto flex aspect-square w-full max-w-sm items-center justify-center rounded-xl bg-white p-3 ring-1 ring-foreground/10">
      <QRCode
        value={value}
        level="L"
        size={256}
        viewBox="0 0 256 256"
        style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
      />
    </div>
  )
}
