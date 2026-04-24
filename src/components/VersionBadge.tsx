import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/shadcn/hover-card';
import { formatRelativeTime } from '@/lib/relativeTime';

const aheadOfTag = __APP_COMMITS_SINCE_TAG__ > 0 || __APP_DIRTY__;
const commitUrl = __APP_REPO_URL__ && __APP_COMMIT__
  ? `${__APP_REPO_URL__}/commit/${__APP_COMMIT__}`
  : '';

function formatAbsolute(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function VersionBadge() {
  const released = formatRelativeTime(__APP_BUILD_TIME__);
  const releasedAbsolute = formatAbsolute(__APP_BUILD_TIME__);
  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <span className="text-[10px] tracking-normal opacity-50 cursor-default">
            v{__APP_VERSION__}{aheadOfTag ? '*' : ''}
          </span>
        }
      />
      <HoverCardContent
        side="top"
        align="end"
        className="w-auto min-w-56 text-xs normal-case tracking-normal font-body"
      >
        <div className="font-semibold">Scribe Steel v{__APP_VERSION__}</div>
        {aheadOfTag && (
          <div className="mt-1 text-[11px] opacity-70">
            {__APP_COMMITS_SINCE_TAG__ > 0 && (
              <div>
                {__APP_COMMITS_SINCE_TAG__} commit{__APP_COMMITS_SINCE_TAG__ === 1 ? '' : 's'} past tag
              </div>
            )}
            {__APP_DIRTY__ && <div>Uncommitted changes</div>}
          </div>
        )}
        <div className="mt-2 pt-2 border-t border-foreground/10 space-y-0.5 text-[11px] opacity-70">
          <div>
            Released{' '}
            <span
              title={releasedAbsolute}
              className="underline decoration-dotted underline-offset-2 cursor-help"
            >
              {released}
            </span>
          </div>
          {__APP_COMMIT__ && (
            <div>
              Commit{' '}
              {commitUrl ? (
                <a
                  href={commitUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono underline decoration-dotted underline-offset-2 hover:opacity-100"
                >
                  {__APP_COMMIT__}
                </a>
              ) : (
                <span className="font-mono">{__APP_COMMIT__}</span>
              )}
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
