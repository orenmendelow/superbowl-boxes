import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Super Bowl LX Boxes — SEA vs NE';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  // 4x4 mini grid to represent the boxes concept
  const gridCells = Array.from({ length: 16 });

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle border accent at top */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            display: 'flex',
          }}
        >
          <div style={{ flex: 1, backgroundColor: '#69be28' }} />
          <div style={{ flex: 1, backgroundColor: '#c60c30' }} />
        </div>

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 32,
          }}
        >
          {/* Title */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', gap: 16, fontSize: 72, fontWeight: 800, letterSpacing: -2 }}>
              <span style={{ color: '#69be28' }}>SB</span>
              <span style={{ color: '#c60c30' }}>LX</span>
              <span style={{ color: '#ededed' }}>Boxes</span>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 28, color: '#888888', fontWeight: 500 }}>
              <span>Seahawks vs Patriots</span>
              <span style={{ color: '#2a2a2a' }}>|</span>
              <span>Feb 8, 2026</span>
            </div>
          </div>

          {/* Mini grid */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              width: 240,
              height: 240,
              gap: 6,
            }}
          >
            {gridCells.map((_, i) => (
              <div
                key={i}
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 6,
                  backgroundColor:
                    i === 0 || i === 5 || i === 10
                      ? '#69be28'
                      : i === 3 || i === 12
                        ? 'rgba(198, 12, 48, 0.6)'
                        : '#1e1e1e',
                  border: '1px solid #2a2a2a',
                  opacity: i === 0 || i === 5 || i === 10 || i === 3 || i === 12 ? 1 : 0.6,
                }}
              />
            ))}
          </div>

          {/* CTA */}
          <div style={{ fontSize: 22, color: '#69be28', fontWeight: 600 }}>
            Pick your boxes — $5 each
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
