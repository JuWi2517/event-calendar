import React, { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
    images: string[];
    title: string;
    subtitle?: string;
    intervalMs?: number;   // default 6000
    waveColor?: string;
    height?: string;       // e.g. "68vh" or "760px"
};

export default function photoCarousel({
                                         images,
                                         title,
                                         subtitle,
                                         intervalMs = 6000,
                                         waveColor,
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

    const waveFill = React.useMemo(() => {
        if (waveColor) return waveColor;
        if (typeof window !== 'undefined') {
            const bg = getComputedStyle(document.body).backgroundColor;
            return bg && bg !== 'rgba(0,0,0,0)' ? bg : '#0b111f';
        }
        return '#0b111f';
    }, [waveColor]);

    if (!safeImages.length) return null;

    return (
        <div
            className="hero-carousel"
            style={height ? ({ ['--hero-height' as any]: height } as React.CSSProperties) : undefined}
        >
            {safeImages.map((src, i) => (
                <img
                    key={src + i}
                    src={src}
                    alt=""
                    className={`hero-slide ${i === idx ? 'is-active' : ''}`}
                    draggable={false}
                />
            ))}

            <div className="hero-overlay" />

            <div className="hero-content">
                <h1 className="hero-title">{title}</h1>
                {subtitle && <p className="hero-subtitle">{subtitle}</p>}
            </div>

            {/* Wavy bottom */}
            <div className="hero-wave" aria-hidden="true">
                <svg viewBox="0 0 1440 140" preserveAspectRatio="none">
                    <path
                        d="M0,64 C160,128 320,0 480,16 C640,32 800,144 960,128 C1120,112 1280,32 1440,80 L1440,160 L0,160 Z"
                        fill={waveFill}
                    />
                </svg>
            </div>
        </div>
    );
}
