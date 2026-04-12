import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <>
      {/* Background accents */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-secondary-container rounded-full blur-[160px] opacity-10" />
      </div>

      <div className="max-w-6xl mx-auto px-8 lg:px-12 pt-8 pb-16 relative z-10">
        {/* Hero */}
        <header className="mb-20 space-y-6">
          <h2 className="font-headline text-5xl md:text-7xl font-bold tracking-tight text-on-surface leading-[1.1]">
            What are we forging today?
          </h2>
          <p className="text-lg md:text-xl text-outline leading-relaxed font-body">
            Welcome to your personal digital grimoire. Scribe Steel is a
            collection of tools for generating handouts and play aides for Draw
            Steel.
          </p>
        </header>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Monster Cards — large featured card */}
          <div className="md:col-span-8 group relative overflow-hidden bg-surface-container-low rounded-md transition-all duration-300 hover:bg-surface-container-high">
            <div className="relative p-12 flex flex-col h-full justify-between min-h-[400px]">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <span className="material-symbols-outlined text-4xl text-primary">
                    skull
                  </span>
                  <div className="h-px flex-1 bg-outline-variant/30" />
                </div>
                <h3 className="font-headline text-3xl mb-4 text-on-surface">
                  Monster Cards
                </h3>
                <p className="text-outline max-w-md leading-relaxed">
                  Stat blocks and tactical references for your adversaries.
                </p>
              </div>
              <div className="mt-8">
                <button className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-primary to-primary-container text-on-primary font-label font-bold tracking-wide rounded-md transition-all hover:translate-x-1">
                  Open Forge
                  <span className="material-symbols-outlined">
                    arrow_forward
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Letters and Notes */}
          <Link
            to="/letters-and-notes"
            className="md:col-span-4 group bg-surface-container-low rounded-md p-12 flex flex-col justify-between transition-all duration-300 hover:bg-surface-container-high no-underline"
          >
            <div>
              <span className="material-symbols-outlined text-3xl text-secondary mb-6 block">
                architecture
              </span>
              <h3 className="font-headline text-2xl mb-3 text-on-surface">
                Letters and Notes
              </h3>
              <p className="text-sm text-outline leading-relaxed">
                Create immersive correspondence and mysterious findings.
              </p>
            </div>
            <span className="mt-8 text-secondary font-label text-sm font-bold tracking-widest uppercase flex items-center gap-2 group-hover:gap-3 transition-all">
              Launch
              <span className="material-symbols-outlined text-lg">
                open_in_new
              </span>
            </span>
          </Link>

          {/* Lore Books */}
          <Link
            to="/lore-books"
            className="md:col-span-4 group bg-surface-container-low rounded-md p-12 flex flex-col justify-between transition-all duration-300 hover:bg-surface-container-high no-underline"
          >
            <div>
              <span className="material-symbols-outlined text-3xl text-secondary mb-6 block">
                workspace_premium
              </span>
              <h3 className="font-headline text-2xl mb-3 text-on-surface">
                Lore Books
              </h3>
              <p className="text-sm text-outline leading-relaxed">
                Formalize history and legends into readable volumes.
              </p>
            </div>
            <span className="mt-8 text-secondary font-label text-sm font-bold tracking-widest uppercase flex items-center gap-2 group-hover:gap-3 transition-all">
              Launch
              <span className="material-symbols-outlined text-lg">open_in_new</span>
            </span>
          </Link>
        </div>
      </div>
    </>
  );
}
