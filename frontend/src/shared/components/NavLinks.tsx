'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/uploads', label: 'Uploads' },
  { href: '/uploads/new', label: 'Nuevo upload' },
];

/** `/` and `/uploads/new` match exactly; `/uploads` and `/uploads/<id>` highlight "Uploads". */
function isActive(href: string, pathname: string): boolean {
  if (href === '/' || href === '/uploads/new') return pathname === href;
  return pathname === href || (pathname.startsWith(`${href}/`) && pathname !== '/uploads/new');
}

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Principal" className="flex gap-5 text-sm font-medium">
      {NAV_LINKS.map((link) => {
        const active = isActive(link.href, pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`rounded transition-colors duration-150 ease-brand motion-reduce:transition-none hover:text-accent-light focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-light/40 ${
              active ? 'text-accent-light' : 'text-white/80'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
