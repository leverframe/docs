import { themes as prismThemes } from 'prism-react-renderer';

const productInstances = [
  { id: 'fleet-bridge', path: 'fleet-bridge', routeBasePath: 'fleet-bridge' },
  { id: 'wranglebot', path: 'wranglebot', routeBasePath: 'wranglebot' },
  { id: 'tractum', path: 'tractum', routeBasePath: 'tractum' },
];

export default {
  title: 'Leverframe Docs',
  tagline: 'Agent infrastructure: bridge, guardrails, verifiable consensus',
  url: 'https://docs.leverframe.dev',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  favicon: 'img/bite-mark.svg',
  headTags: [
    {
      tagName: 'link',
      attributes: { rel: 'icon', type: 'image/svg+xml', href: '/img/bite-mark.svg' },
    },
  ],
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },
  favicon: 'img/favicon.ico',
  organizationName: 'leverframe',
  projectName: 'docs',
  i18n: { defaultLocale: 'en', locales: ['en'] },
  presets: [
    [
      'classic',
      {
        docs: false,
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      },
    ],
  ],
  themeConfig: {
    colorMode: { defaultMode: 'dark', respectPrefersColorScheme: false },
    navbar: {
      title: 'Leverframe',
      logo: {
        alt: 'Leverframe bite mark',
        src: '/img/bite-mark.svg',
      },
      items: [
        { to: '/fleet-bridge', label: 'fleet-bridge', position: 'left' },
        { to: '/wranglebot', label: 'wranglebot', position: 'left' },
        { to: '/tractum', label: 'tractum', position: 'left' },
        {
          href: 'https://github.com/leverframe',
          position: 'right',
          className: 'header-github-link',
          'aria-label': 'GitHub',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `© ${new Date().getFullYear()} Leverframe · docs built from source · licenses per product (MIT / BUSL-1.1)`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  },
  plugins: productInstances.map((p) => [
    '@docusaurus/plugin-content-docs',
    {
      id: p.id,
      path: p.path,
      routeBasePath: p.routeBasePath,
      sidebarPath: './sidebars.ts',
      editUrl: undefined,
    },
  ]),
};
