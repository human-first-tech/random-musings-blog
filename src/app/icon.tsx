import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        background: '#fdfaf6',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '6px',
      }}
    >
      <span
        style={{
          color: '#4f46e5',
          fontSize: 22,
          fontWeight: 700,
          fontFamily: 'Georgia, serif',
          lineHeight: 1,
          marginTop: 1,
        }}
      >
        R
      </span>
    </div>,
    { ...size },
  );
}
