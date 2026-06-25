import { ImageResponse } from 'next/og';

export const alt = 'SOS Venezuela — Plataforma de ayuda en emergencia';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #07101d 0%, #0b3d66 55%, #15639f 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#2dd4bf',
            }}
          />
          <div style={{ color: '#9ec5e8', fontSize: '34px', fontWeight: 600 }}>
            sosvzla.com
          </div>
        </div>
        <div
          style={{
            color: '#ffffff',
            fontSize: '128px',
            fontWeight: 900,
            letterSpacing: '-4px',
            marginTop: '40px',
          }}
        >
          SOS Venezuela
        </div>
        <div
          style={{
            color: '#cfe2f3',
            fontSize: '44px',
            fontWeight: 500,
            marginTop: '12px',
            maxWidth: '900px',
          }}
        >
          Reporta emergencias, búscalas en el mapa y encuentra personas.
        </div>
      </div>
    ),
    { ...size },
  );
}
