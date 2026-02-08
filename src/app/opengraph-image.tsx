import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Super Bowl LX Boxes — SEA vs NE';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  // 10x10 grid to match the actual board
  const rows = 10;
  const cols = 10;
  // Highlight pattern — scattered claimed boxes for visual interest
  const highlighted = new Set([
    0, 3, 7, 12, 15, 18, 21, 24, 29, 33, 36, 41, 44, 48,
    52, 55, 58, 61, 65, 70, 73, 77, 82, 85, 88, 91, 94, 99,
  ]);
  const redCells = new Set([7, 29, 52, 77, 94]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow — green */}
        <div
          style={{
            position: 'absolute',
            top: -100,
            left: -100,
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(105,190,40,0.12) 0%, transparent 70%)',
          }}
        />
        {/* Background glow — red */}
        <div
          style={{
            position: 'absolute',
            bottom: -100,
            right: -100,
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(198,12,48,0.1) 0%, transparent 70%)',
          }}
        />

        {/* Left side — text content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            paddingLeft: 80,
            flex: 1,
            zIndex: 1,
          }}
        >
          {/* Super Bowl badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: '#888888',
            }}
          >
            SUPER BOWL LX
          </div>

          {/* Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', gap: 14, fontSize: 80, fontWeight: 800, letterSpacing: -3, lineHeight: 1 }}>
              <span style={{ color: '#69be28' }}>SEA</span>
              <span style={{ color: '#2a2a2a' }}>vs</span>
              <span style={{ color: '#c60c30' }}>NE</span>
            </div>
          </div>

          {/* Subtitle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#ededed', letterSpacing: -1 }}>
              Squares Pool
            </div>
            <div style={{ fontSize: 20, color: '#888888', fontWeight: 400 }}>
              Feb 8, 2026 · $5/box
            </div>
          </div>

          {/* Accent line */}
          <div
            style={{
              display: 'flex',
              width: 120,
              height: 3,
              borderRadius: 2,
            }}
          >
            <div style={{ flex: 1, backgroundColor: '#69be28' }} />
            <div style={{ flex: 1, backgroundColor: '#c60c30' }} />
          </div>
        </div>

        {/* Right side — grid */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            paddingRight: 60,
            zIndex: 1,
          }}
        >
          {Array.from({ length: rows }).map((_, row) => (
            <div key={row} style={{ display: 'flex', gap: 3 }}>
              {Array.from({ length: cols }).map((_, col) => {
                const idx = row * cols + col;
                const isGreen = highlighted.has(idx) && !redCells.has(idx);
                const isRed = redCells.has(idx);
                return (
                  <div
                    key={col}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 4,
                      backgroundColor: isGreen
                        ? 'rgba(105,190,40,0.7)'
                        : isRed
                          ? 'rgba(198,12,48,0.5)'
                          : '#141414',
                      border: `1px solid ${isGreen ? 'rgba(105,190,40,0.3)' : isRed ? 'rgba(198,12,48,0.3)' : '#1e1e1e'}`,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
