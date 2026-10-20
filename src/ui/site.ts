/**
 * The site's pages and the menus that lead to them, the same on every page
 * (docs/design/0012-interface.md section 7). Links are relative to the
 * page's own folder, so the built site works from any path on a static host.
 */

import interLicence from './fonts/Inter-OFL.txt?url';
import monoLicence from './fonts/JetBrainsMono-OFL.txt?url';

export const REPOSITORY = 'https://github.com/ahroonsanthosh/bowshock';

export type PageId = 'home' | 'drag' | 'flow' | 'ramp' | 'shock-tube';

export interface MenuItem {
  readonly label: string;
  /** A short line under the label. */
  readonly detail?: string;
  readonly href?: string;
  readonly external?: boolean;
  readonly action?: () => void;
  /** The key that does the same, shown beside the item. */
  readonly key?: string;
  /** For a toggle: whether it is on now. */
  readonly pressed?: () => boolean;
  readonly current?: boolean;
}

export interface MenuGroup {
  readonly id: string;
  readonly label: string;
  readonly items: readonly MenuItem[];
}

/** Each page's path from the site's root. */
const PATHS: Readonly<Record<PageId, string>> = {
  home: 'index.html',
  drag: 'demos/nose-drag.html',
  flow: 'demos/flow-view.html',
  ramp: 'demos/supersonic-ramp.html',
  'shock-tube': 'demos/shock-tube.html',
};

/** The path of a page from the current page, whose folder is `root` below the site's root. */
export function pagePath(root: string, page: PageId): string {
  return `${root}${PATHS[page]}`;
}

/** The menus every page shows (a page adds its own View menu). */
export function siteMenus(root: string, current: PageId): MenuGroup[] {
  const page = (id: PageId, label: string, detail: string): MenuItem => ({
    label,
    detail,
    href: pagePath(root, id),
    current: id === current,
  });
  return [
    {
      id: 'rocket',
      label: 'Rocket',
      items: [
        page('drag', 'Nose wave drag', 'The wave drag of a nose and its body, with its error band'),
      ],
    },
    {
      id: 'validation',
      label: 'Validation',
      items: [
        page('ramp', 'Supersonic ramp', 'Oblique shocks and expansion fans against exact theory'),
        page('shock-tube', 'Shock tube', "Toro's five Riemann problems against the exact solution"),
      ],
    },
    {
      id: 'about',
      label: 'About',
      items: [
        page('home', 'bowshock', 'What it is, and your GPU'),
        {
          label: 'What is validated',
          detail: 'The claims, each with its measured accuracy (README)',
          href: `${REPOSITORY}#readme`,
          external: true,
        },
        {
          label: 'Design records',
          detail: 'What was decided, why, and the measurements',
          href: `${REPOSITORY}/tree/HEAD/docs/design`,
          external: true,
        },
        {
          label: 'Source code',
          detail: 'AGPL-3.0-or-later',
          href: REPOSITORY,
          external: true,
        },
        { label: 'Inter font licence', detail: 'SIL Open Font License 1.1', href: interLicence },
        {
          label: 'JetBrains Mono font licence',
          detail: 'SIL Open Font License 1.1',
          href: monoLicence,
        },
      ],
    },
  ];
}
