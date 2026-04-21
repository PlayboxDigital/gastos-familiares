PARA COMPLETAR LA INSTALACIÃ“N PWA:

Es necesario agregar los siguientes archivos de Ã­cono en la carpeta /public:

1. pwa-192x192.png (Dimensiones: 192x192 pÃ­xeles)
2. pwa-512x512.png (Dimensiones: 512x512 pÃ­xeles)
3. pwa-512x512-maskable.png (Dimensiones: 512x512 pÃ­xeles, con margen de seguridad para recortes)

Estos archivos son requeridos por el manifest definido en vite.config.ts para que la app sea instalable de forma correcta en dispositivos móviles.
