import { useState, useEffect } from 'react';
import { app } from '../firebase.ts';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';

const storage = getStorage(app);

interface Props {
  path: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}

export default function PosterPathFinder({ path, alt, className, loading = 'lazy' }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!path) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    // Derive resized path: strip extension, append _640x853.webp
    const lastDot = path.lastIndexOf('.');
    const resizedPath =
      lastDot !== -1
        ? `${path.substring(0, lastDot)}_640x853.webp`
        : `${path}_640x853.webp`;

    const resizedRef = ref(storage, resizedPath);
    const originalRef = ref(storage, path);

    getDownloadURL(resizedRef)
      .then((downloadUrl) => {
        if (isMounted) {
          setUrl(downloadUrl);
          setIsLoading(false);
        }
      })
      .catch(() => {
        // Resized not found, fall back to original
        getDownloadURL(originalRef)
          .then((downloadUrl) => {
            if (isMounted) {
              setUrl(downloadUrl);
              setIsLoading(false);
            }
          })
          .catch((error) => {
            console.error(`Error loading image (${path}):`, error.code);
            if (isMounted) setIsLoading(false);
          });
      });

    return () => {
      isMounted = false;
    };
  }, [path]);

  if (isLoading) {
    return <div className={className} style={{ backgroundColor: '#333' }} />;
  }

  if (!url) {
    return <div className={className} style={{ backgroundColor: '#222' }} />;
  }

  return <img src={url} alt={alt} className={className} loading={loading} />;
}