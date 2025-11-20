import  { useState, useEffect } from 'react';
import { storage } from '../firebase';
import { ref, getDownloadURL } from 'firebase/storage';

interface Props {
    path: string;
    alt: string;
    className?: string;
    fallbackPath?: string;
    loading?: 'lazy' | 'eager';
}

export default function PosterPathFinder({ path, alt, className, fallbackPath, loading = 'lazy' }: Props) {
    const [url, setUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!path) {
            setIsLoading(false);
            return;
        }

        let isMounted = true;
        const imageRef = ref(storage, path);

        const fetchUrl = (storageRef: typeof imageRef, isFallback: boolean = false) => {
            getDownloadURL(storageRef)
                .then((downloadUrl) => {
                    if (isMounted) {
                        setUrl(downloadUrl);
                        setIsLoading(false);
                    }
                })
                .catch((error) => {
                    console.error(`Chyba při načítání obrázku (${path}):`, error.code);

                    if (!isFallback && fallbackPath) {
                        console.log("Zkouším záložní obrázek:", fallbackPath);
                        fetchUrl(ref(storage, fallbackPath), true);
                    } else {
                        if (isMounted) setIsLoading(false);
                    }
                });
        };

        fetchUrl(imageRef);

        return () => {
            isMounted = false;
        };

    }, [path, fallbackPath]);

    if (isLoading) {
        return <div className={className} style={{ backgroundColor: '#333' }} />;
    }

    if (!url) {
        return <div className={className} style={{ backgroundColor: '#222' }} />;
    };

    return (
        <img
            src={url}
            alt={alt}
            className={className}
            loading={loading}
        />
    );
}