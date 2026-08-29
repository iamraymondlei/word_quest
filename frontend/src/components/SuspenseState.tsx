import React, { ReactNode } from 'react';

interface Props {
  isLoading: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

export const SuspenseState: React.FC<Props> = ({ isLoading, children, fallback }) => {
  if (isLoading) {
    return (
      fallback || (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px', width: '100%' }}>
          <div style={{ height: '30px', background: 'linear-gradient(90deg, #f2f2f2 25%, #e6e6e6 50%, #f2f2f2 75%)', backgroundSize: '200% 100%', animation: 'loading-pulse 1.5s infinite', borderRadius: '6px' }}></div>
          <div style={{ height: '100px', background: 'linear-gradient(90deg, #f2f2f2 25%, #e6e6e6 50%, #f2f2f2 75%)', backgroundSize: '200% 100%', animation: 'loading-pulse 1.5s infinite', borderRadius: '6px' }}></div>
          <style>{`
            @keyframes loading-pulse {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
          `}</style>
        </div>
      )
    );
  }
  return <>{children}</>;
};
