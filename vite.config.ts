import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import Sitemap from 'vite-plugin-sitemap'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

export default defineConfig({
    base: '/',
    build:{
        sourcemap: true,
    },
    plugins: [
        cssInjectedByJsPlugin(),
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
            generateRobotsTxt: false,
        }),
    ],
})