import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const tools = [
  {
    label: 'Monster Cards',
    icon: 'skull',
    to: '/monster-cards',
    description: 'Pick monsters from the bestiary and generate printable 3x5 index cards with stats, abilities, and traits.',
  },
  {
    label: 'Encounter Sheet',
    icon: 'swords',
    to: '/encounter-sheet',
    description: 'Build a one-page GM reference sheet for running combats — creature groups, malice features, conditions, and notes.',
  },
  {
    label: 'Letters and Notes',
    icon: 'architecture',
    to: '/letters-and-notes',
    description: 'Create handwritten-style props to hand your players — letters, journal entries, mysterious notes.',
  },
  {
    label: 'Lore Books',
    icon: 'auto_stories',
    to: '/lore-books',
    description: 'Formatted in-world documents — histories, religious texts, research notes, anything your players might find on a shelf.',
  },
];

export function HomePage() {
  const { isSignedIn, isConfigured, signIn } = useAuth();

  return (
    <>
      {/* Background accents */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-secondary-container rounded-full blur-[160px] opacity-10" />
      </div>

      <div className="max-w-5xl mx-auto px-8 lg:px-12 pt-8 pb-16 relative z-10">
        {/* Hero */}
        <header className="mb-16 space-y-6">
          <h2 className="font-headline text-5xl md:text-7xl font-bold tracking-tight text-on-surface leading-[1.1]">
            Scribe Steel
          </h2>
          <div className="space-y-4 text-lg text-outline leading-relaxed font-body">
            <p>
              Printable play aids for <strong className="text-on-surface">Draw Steel</strong> — monster reference cards, encounter sheets, handwritten letters, lore books, and more to come. Everything renders as a live preview and exports to PDF, ready to print.
            </p>
            <p className="text-base">
              Templates are powered by <a href="https://typst.app" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Typst</a>, a modern typesetting language. The editor gives you direct access to the Typst source, so you can tweak layouts beyond what the form controls offer.
            </p>
            {isConfigured && !isSignedIn && (
              <p className="text-base">
                <button onClick={signIn} className="text-primary hover:underline cursor-pointer font-semibold">Sign in with Google</button> to save your work to Google Drive. You can try out the tools without signing in, but your work won't be saved between sessions.
              </p>
            )}
          </div>
        </header>

        {/* Tool grid */}
        <section>
          <h3 className="text-xs font-label font-bold tracking-widest uppercase text-on-surface-variant/50 mb-4">
            Tools
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tools.map((tool) => (
              <Link
                key={tool.to}
                to={tool.to}
                className="group bg-surface-container-low rounded-md p-8 flex flex-col transition-all duration-300 hover:bg-surface-container-high no-underline"
              >
                <div className="flex items-center gap-4 mb-4">
                  <span className="material-symbols-outlined text-3xl text-primary">
                    {tool.icon}
                  </span>
                  <div className="h-px flex-1 bg-outline-variant/30" />
                </div>
                <h4 className="font-headline text-xl mb-2 text-on-surface">
                  {tool.label}
                </h4>
                <p className="text-sm text-outline leading-relaxed flex-1">
                  {tool.description}
                </p>
                <span className="mt-6 text-secondary font-label text-sm font-bold tracking-widest uppercase flex items-center gap-2 group-hover:gap-3 transition-all">
                  Open
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
