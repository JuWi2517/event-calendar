
import { useEffect, useMemo, useRef, useState } from 'react';
import '../css/PhotoCarousel.css';

type Props = {
    images: string[];
    title: string;
    subtitle?: string;
    intervalMs?: number;
    waveColor?: string;
    height?: string;
};

export default function PhotoCarousel({
                                          images,
                                          title,
                                          subtitle,
                                          intervalMs = 6000,
                                          height,
                                      }: Props) {
    const [idx, setIdx] = useState(0);
    const timerRef = useRef<number | null>(null);
    const safeImages = useMemo(() => images.filter(Boolean), [images]);

    // Endless autoplay, no hover pause, no controls
    useEffect(() => {
        if (safeImages.length <= 1) return;
        timerRef.current && clearInterval(timerRef.current);
        timerRef.current = window.setInterval(() => {
            setIdx((i) => (i + 1) % safeImages.length);
        }, intervalMs);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [intervalMs, safeImages.length]);

    if (!safeImages.length) return null;

    return (
        <div
            className="hero-carousel"
            style={height ? ({ ['--hero-height' as any]: height } as React.CSSProperties) : undefined}
        >
            {/* 2. Add types (string, number) to map parameters */}
            {safeImages.map((src: string, i: number) => (
                <img
                    key={src + i}
                    src={src}
                    alt=""
                    className={`hero-slide ${i === idx ? 'is-active' : ''}`}
                    draggable={false}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    fetchPriority={i === 0 ? 'high' : 'auto'}
                />
            ))}

            <div className="hero-overlay" />

            <div className="hero-content">
                <h1 className="hero-title">{title}</h1>
                {subtitle && <p className="hero-subtitle">{subtitle}</p>}
            </div>


        </div>
    );
}