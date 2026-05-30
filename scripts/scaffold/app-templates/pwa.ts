import type { AppScaffoldOptions } from '../types';

export function manifestTemplate(options: AppScaffoldOptions): string {
  return `${JSON.stringify(
    {
      id: '/',
      name: options.name,
      short_name: options.name,
      theme_color: options.themeColor,
      background_color: options.backgroundColor,
      display: 'standalone',
      scope: '/',
      start_url: '/?source=pwa',
      icons: [
        {
          src: 'assets/images/utildex_logo.png',
          sizes: '1024x1024',
          type: 'image/png',
        },
      ],
      orientation: 'portrait',
      description: options.description,
    },
    null,
    2,
  )}\n`;
}

export function ngswTemplate(): string {
  return `${JSON.stringify(
    {
      $schema: './node_modules/@angular/service-worker/config/schema.json',
      index: '/index.html',
      assetGroups: [
        {
          name: 'app',
          installMode: 'prefetch',
          updateMode: 'prefetch',
          resources: {
            files: ['/index.html', '/*.css', '/*.js'],
          },
        },
        {
          name: 'assets-core',
          installMode: 'prefetch',
          updateMode: 'prefetch',
          resources: {
            files: [
              '/assets/theme-init.js',
              '/assets/flags/**',
              '/assets/fonts/**',
              '/assets/images/**',
              '/assets/pdfjs/**',
              '/assets/styles/**',
              '/*.(svg|cur|jpg|jpeg|png|apng|webp|avif|gif|otf|ttf|woff|woff2)',
            ],
          },
        },
      ],
    },
    null,
    2,
  )}\n`;
}
