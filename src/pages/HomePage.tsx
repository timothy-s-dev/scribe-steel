import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface Tool {
  label: string;
  icon: string;
  to: string;
  description: React.ReactNode;
}

const documentTools: Tool[] = [
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
    description: <>Executive summary style documents summarizing in-world texts. Inspired by <a href="https://thealexandrian.net/wordpress/45361/roleplaying-games/ptolus-running-the-campaign-using-lore-books" target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-primary/40 hover:decoration-primary">The Alexandrian's post about Lore Books</a>.</>,
  },
];

const bestiaryTools: Tool[] = [
  {
    label: 'Monster Cards',
    icon: 'skull',
    to: '/monster-cards',
    description: 'Pick monsters and generate printable 3x5 index cards with stats, abilities, and traits.',
  },
  {
    label: 'Encounter Sheets',
    icon: 'swords',
    to: '/encounter-sheets',
    description: 'Build a one-page GM reference sheet for running combats — creature groups, malice features, conditions, and notes.',
  },
];

function ToolCard({ tool }: { tool: Tool }) {
  return (
    <div className="group bg-surface-container-low rounded-md p-8 flex flex-col">
      <div className="flex items-center gap-4 mb-4">
        <span className="material-symbols-outlined text-3xl text-primary" aria-hidden="true">
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
      <Link
        to={tool.to}
        className="mt-6 text-secondary font-label text-sm font-bold tracking-widest uppercase flex items-center gap-2 hover:gap-3 transition-all no-underline"
      >
        Open
        <span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_forward</span>
      </Link>
    </div>
  );
}

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
              Printable play aids for <strong className="text-on-surface">Draw Steel</strong> — monster reference cards, encounter sheets, handwritten letters, lore books, and more to come. Everything renders as a live preview and exports to PDF, ready to print or share virtually with your players.
            </p>
            <p className="text-base">
              Templates are powered by <a href="https://typst.app" target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-primary/40 hover:decoration-primary">Typst</a>, a modern typesetting language. The editor gives you direct access to the Typst source, so you can tweak layouts beyond what the form controls offer.
            </p>
            {isConfigured && !isSignedIn && (
              <p className="text-base">
                <button onClick={signIn} className="text-primary underline decoration-primary/40 hover:decoration-primary cursor-pointer font-semibold">Sign in with Google</button> to save your work to Google Drive. You can try out the tools without signing in, but your work won't be saved between sessions.
              </p>
            )}
          </div>
        </header>

        {/* Documents */}
        <section className="mb-12">
          <h3 className="text-xs font-label font-bold tracking-widest uppercase text-on-surface-variant/50 mb-2">
            Documents
          </h3>
          <p className="text-sm text-outline leading-relaxed font-body mb-4">
            Printable handouts to give your players at the table — in-character letters, mysterious notes, lore books, and other props that make the world feel real. Sign in to save your documents to Google Drive, or try them out without an account.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {documentTools.map((tool) => (
              <ToolCard key={tool.to} tool={tool} />
            ))}
          </div>
        </section>

        {/* Bestiary */}
        <section>
          <h3 className="text-xs font-label font-bold tracking-widest uppercase text-on-surface-variant/50 mb-2">
            Bestiary
          </h3>
          <p className="text-sm text-outline leading-relaxed font-body mb-4">
            Tools for running combats. The app ships with a set of stock monsters you can use right away, or create your own custom stat blocks. Pick monsters from the bestiary to generate reference cards or build encounter sheets.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bestiaryTools.map((tool) => (
              <ToolCard key={tool.to} tool={tool} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
