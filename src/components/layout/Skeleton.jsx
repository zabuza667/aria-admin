// Composant skeleton loading réutilisable
export function SkeletonLine({ width = '100%', height = 14, borderRadius = 6, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.06) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      ...style,
    }} />
  )
}

export function SkeletonCard({ style = {} }) {
  return (
    <div style={{
      background: '#12141f', border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 12,
      ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <SkeletonLine width={36} height={36} borderRadius={10} />
        <SkeletonLine width={50} height={28} borderRadius={8} />
      </div>
      <SkeletonLine width="60%" height={12} />
    </div>
  )
}

export function SkeletonList({ rows = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{
          background: '#12141f', border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14,
          opacity: 1 - i * 0.15,
        }}>
          <SkeletonLine width={40} height={40} borderRadius="50%" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SkeletonLine width="70%" height={13} />
            <SkeletonLine width="40%" height={10} />
          </div>
          <SkeletonLine width={60} height={24} borderRadius={99} />
        </div>
      ))}
    </div>
  )
}

export function SkeletonDashboard() {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SkeletonLine width={200} height={22} borderRadius={8} />
          <SkeletonLine width={140} height={13} borderRadius={6} />
        </div>
        <SkeletonLine width={140} height={36} borderRadius={10} />
      </div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
        {[0,1,2,3].map(i => <SkeletonCard key={i} />)}
      </div>
      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[0,1,2,3,4].map(i => <SkeletonLine key={i} width={90} height={34} borderRadius={10} />)}
      </div>
      {/* Chat */}
      <div style={{ background: '#12141f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, height: 300 }}>
        <SkeletonLine width={160} height={14} borderRadius={6} style={{ marginBottom: 20 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}><SkeletonLine width="55%" height={38} borderRadius={12} /></div>
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}><SkeletonLine width="70%" height={54} borderRadius={12} /></div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}><SkeletonLine width="40%" height={38} borderRadius={12} /></div>
        </div>
      </div>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  )
}

// HOC pour afficher skeleton pendant chargement
export function WithSkeleton({ loading, skeleton, children }) {
  return loading ? skeleton : children
}
