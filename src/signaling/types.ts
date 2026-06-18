/** Минимальное описание WebRTC-сигнала (структурно совместимо с RTCSessionDescriptionInit). */
export interface SignalDescription {
  type: 'offer' | 'answer'
  sdp: string
}

// Псевдоним для читаемости в codec (исторически использовался DOM-тип).
export type RTCSessionDescriptionInit = SignalDescription
