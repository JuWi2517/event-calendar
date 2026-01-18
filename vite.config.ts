import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import Sitemap from 'vite-plugin-sitemap'

export default defineConfig({
    base: '/',
    plugins: [
        react(),
        Sitemap({
            hostname: 'https://www.planujlouny.cz',
            dynamicRoutes: [
                '/',
                '/prihlaseni',
                '/registrace',
                '/reset-hesla',
                '/gdpr'
            ],
            exclude: ['/moje-akce', '/admin/dashboard'],
            readable: true,
        }),
    ],
})