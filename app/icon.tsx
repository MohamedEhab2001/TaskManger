import { ImageResponse } from 'next/server';

export const size = {
  width: 32,
  height: 32,
};

export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#2563eb',
          borderRadius: 8,
          color: '#ffffff',
          fontSize: 16,
          fontWeight: 800,
          fontFamily: 'Arial, Helvetica, sans-serif',
          lineHeight: 1,
        }}
      >
        TP
      </div>
    ),
    {
      ...size,
    }
  );
}
