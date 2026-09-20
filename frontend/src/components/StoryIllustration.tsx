import React, { useState, useEffect, useRef } from 'react';
import { offlineStorage } from '../utils/offlineStorage';

interface StoryIllustrationProps {
  src?: string | null;
  alt?: string;
  className?: string;
  allowZoom?: boolean;
  pageNumber?: number;
  caption?: string;
}

export const StoryIllustration: React.FC<StoryIllustrationProps> = ({
  src,
  alt = 'Story Illustration',
  className = '',
  allowZoom = true,
  pageNumber,
  caption,
}) => {
  const [currentSrc, setCurrentSrc] = useState<string | null>(src || null);
  const [isFallbackAttempted, setIsFallbackAttempted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setCurrentSrc(src || null);
    setIsFallbackAttempted(false);
    setHasError(!src);
    setIsLoading(!!src);
  }, [src]);

  // Check if image is already cached/complete on mount or src change
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoading(false);
    }
  }, [currentSrc]);

  // Safety fallback: cancel skeleton after 3s to never stay stuck
  useEffect(() => {
    if (!isLoading || !currentSrc) return;
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [isLoading, currentSrc]);

  // Attempt IndexedDB blob fallback if standard image fetch/sw fails
  const handleError = async () => {
    if (!isFallbackAttempted && src) {
      setIsFallbackAttempted(true);
      try {
        const objectUrl = await offlineStorage.getIllustrationObjectURL(src);
        if (objectUrl) {
          setCurrentSrc(objectUrl);
          setHasError(false);
          setIsLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Failed to retrieve fallback illustration from IndexedDB:', e);
      }
    }
    setIsLoading(false);
    setHasError(true);
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  if (!src || hasError) {
    return null;
  }

  return (
    <>
      <div
        className={`relative group overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-950/60 shadow-lg transition-all ${className}`}
      >
        {/* Loading shimmer skeleton */}
        {isLoading && (
          <div className="w-full h-48 sm:h-64 bg-slate-900 animate-pulse flex items-center justify-center text-slate-500 font-mono text-xs">
            <span>🖼️ 正在载入插图...</span>
          </div>
        )}

        {/* Story Illustration Image */}
        {currentSrc && (
          <img
            ref={imgRef}
            src={currentSrc}
            alt={alt}
            onLoad={handleLoad}
            onError={handleError}
            className={`w-full max-h-[380px] sm:max-h-[460px] object-contain mx-auto transition-opacity duration-300 ${
              isLoading ? 'opacity-0 absolute inset-0' : 'opacity-100 block'
            } ${allowZoom ? 'cursor-zoom-in group-hover:scale-[1.01]' : ''}`}
            onClick={() => allowZoom && setIsZoomed(true)}
          />
        )}

        {/* Page / Illustration Tag Badge */}
        {!isLoading && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-cyan-500/30 text-cyan-300 text-[11px] font-mono shadow-sm pointer-events-none select-none">
            <span>🎨</span>
            <span>{pageNumber ? `第 ${pageNumber} 页绘本插图` : '绘本插图'}</span>
          </div>
        )}

        {/* Click to zoom overlay badge on hover */}
        {allowZoom && !isLoading && (
          <button
            type="button"
            onClick={() => setIsZoomed(true)}
            className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/20 text-white text-xs font-mono cursor-pointer hover:bg-black/90 select-none"
            title="点击全屏查看清晰原图"
          >
            <span>🔍 点击全屏</span>
          </button>
        )}

        {caption && !isLoading && (
          <div className="p-2 text-center text-xs text-slate-400 font-mono border-t border-slate-800 bg-slate-950/40">
            {caption}
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {isZoomed && currentSrc && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsZoomed(false)}
        >
          <div
            className="relative max-w-5xl max-h-[95vh] w-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Toolbar */}
            <div className="w-full flex items-center justify-between pb-3 px-2 text-white font-mono text-sm">
              <div className="flex items-center gap-2">
                <span className="text-xl">🖼️</span>
                <span className="font-bold">
                  {pageNumber ? `第 ${pageNumber} 页插图高清大图` : '绘本插图高清大图'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsZoomed(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg cursor-pointer transition-all border border-white/20"
                title="关闭全屏"
              >
                ✕
              </button>
            </div>

            {/* High-res Image */}
            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/40 p-1 max-h-[85vh] flex items-center justify-center">
              <img
                src={currentSrc}
                alt={alt}
                className="max-h-[82vh] max-w-full object-contain rounded-xl select-none"
              />
            </div>

            {/* Bottom Tip for iPad */}
            <div className="pt-2 text-xs text-slate-400 font-mono text-center">
              💡 点击图片外部任意区域或右上角 ✕ 即可返回阅读
            </div>
          </div>
        </div>
      )}
    </>
  );
};
