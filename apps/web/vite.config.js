import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
export default defineConfig({root,envDir:root,envPrefix:'PI_PUBLIC_',cacheDir:`${root}.vite`,optimizeDeps:{include:['react','react-dom/client','react/jsx-runtime','react/jsx-dev-runtime','leaflet']},
  esbuild:{jsx:'automatic'},build:{outDir:'dist',emptyOutDir:true},
  server:{host:'127.0.0.1',fs:{strict:true,allow:[root,fileURLToPath(new URL('../../node_modules/vite/dist/client',import.meta.url)),fileURLToPath(new URL('../../node_modules/leaflet/dist',import.meta.url))],deny:['**/.env','**/.env.*','**/*.pem','**/*.key']}}});
