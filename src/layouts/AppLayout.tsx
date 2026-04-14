import { Link, NavLink, Outlet } from 'react-router-dom';
import { SignInButton } from '@/components/SignInButton';
import { SaveStatusBanner } from '@/components/SaveStatusBanner';

interface NavItem {
  label: string;
  icon: string;
  to: string;
  placeholder?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

type NavEntry = NavItem | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return 'items' in entry;
}

const mainNav: NavEntry[] = [
  {
    label: 'Documents',
    items: [
      { label: 'Letters and Notes', icon: 'architecture', to: '/letters-and-notes' },
      { label: 'Lore Books', icon: 'auto_stories', to: '/lore-books' },
    ],
  },
  {
    label: 'Bestiary',
    items: [
      { label: 'Stat Blocks', icon: 'menu_book', to: '/', placeholder: true },
      { label: 'Monster Cards', icon: 'skull', to: '/monster-cards' },
      { label: 'Encounter Sheet', icon: 'swords', to: '/encounter-sheet' },
    ],
  },
];

const footerLinks: NavItem[] = [
  { label: 'Report a Bug', icon: 'bug_report', to: '/' },
  { label: 'GitHub', icon: 'code', to: '/' },
  { label: 'Release Notes', icon: 'history', to: '/' },
];

const footerActions: NavItem[] = [
  { label: 'Settings', icon: 'settings', to: '/', placeholder: true },
];

const inactiveClass = 'text-slate-400 font-medium hover:bg-surface-container-low hover:text-primary';
const activeClass = 'text-primary font-bold bg-surface-container-high border-l-2 border-primary';

function SidebarLink({ item, small, indented }: { item: NavItem; small?: boolean; indented?: boolean }) {
  const base = [
    'flex items-center gap-3 transition-all duration-200 ease-in-out',
    small ? 'px-4 py-2 text-xs' : indented ? 'pl-8 pr-4 py-2.5 text-sm tracking-wide' : 'px-4 py-3 text-sm tracking-wide',
  ].join(' ');

  if (item.placeholder || small) {
    return (
      <NavLink to={item.to} className={`${base} ${inactiveClass}`}>
        <span className={`material-symbols-outlined ${small ? 'text-lg' : 'text-xl'}`}>
          {item.icon}
        </span>
        <span className="font-body">{item.label}</span>
      </NavLink>
    );
  }

  return (
    <NavLink
      to={item.to}
      end
      className={({ isActive }) => `${base} ${isActive ? activeClass : inactiveClass}`}
    >
      <span className="material-symbols-outlined text-xl">{item.icon}</span>
      <span className="font-body">{item.label}</span>
    </NavLink>
  );
}

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="hidden md:flex sticky top-0 h-screen w-72 bg-surface flex-col py-8 px-6 shadow-[0_0_40px_-15px_rgba(165,204,223,0.06)]">
        <Link to="/" className="mb-8 px-2 block no-underline">
          <h1 className="font-headline text-xl font-bold tracking-tighter text-secondary leading-none mb-2">
            Scribe Steel
          </h1>
          <p className="font-label text-xs tracking-widest uppercase text-outline opacity-70">
            The Digital Grimoire
          </p>
        </Link>

        <nav className="flex-1 space-y-1">
          {mainNav.map((entry) =>
            isGroup(entry) ? (
              <div key={entry.label} className="pt-3 first:pt-0">
                <div className="px-4 pb-1 text-xs font-label font-bold tracking-widest uppercase text-on-surface-variant/50">
                  {entry.label}
                </div>
                {entry.items.map((item) => (
                  <SidebarLink key={item.label} item={item} indented />
                ))}
              </div>
            ) : (
              <SidebarLink key={entry.label} item={entry} />
            ),
          )}
        </nav>

        <div className="mt-auto pt-6 flex flex-col gap-y-1">
          {footerLinks.map((item) => (
            <SidebarLink key={item.label} item={item} small />
          ))}
          <div className="my-2 mx-4 border-t border-outline-variant/20" />
          {footerActions.map((item) => (
            <SidebarLink key={item.label} item={item} small />
          ))}
          <SignInButton />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto custom-scrollbar bg-surface relative">
        <Outlet />
      </main>
      <SaveStatusBanner />
    </div>
  );
}
