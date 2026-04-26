import { useCallback, useState } from 'react';

type ChangeEvent<E> = React.ChangeEvent<E>;

// Mirrors a controlled input/textarea value in local state so the rendered
// `value` prop updates synchronously inside the keystroke's event. Without
// this, edits routed through an external store (TanStack Query's cache,
// useSyncExternalStore) don't reach React's controlled-input bookkeeping
// before the commit that follows the event — React then "restores" the DOM
// to the stale prop and re-sets it, which moves the caret to the end
// whenever the user typed anywhere except the end.
//
// The prop value is still authoritative: a prop change between renders
// (a reload, a conflict resolution) overrides local state. We detect that
// by comparing the incoming prop to the prop seen on the previous render
// (`lastSeenProp`), not to local state — comparing against local state
// would also fire when the prop simply hasn't caught up to a keystroke
// yet, causing a flap. The set-state-during-render pattern below is the
// React-docs-recommended way to derive state from changing props.
export function useMirroredInputValue<E extends HTMLInputElement | HTMLTextAreaElement>(
  value: React.InputHTMLAttributes<E>['value'],
  onChange: ((e: ChangeEvent<E>) => void) | undefined,
) {
  const [local, setLocal] = useState(value ?? '');
  const [lastSeenProp, setLastSeenProp] = useState(value);

  if (value !== lastSeenProp) {
    setLastSeenProp(value);
    setLocal(value ?? '');
  }

  const handleChange = useCallback(
    (e: ChangeEvent<E>) => {
      setLocal(e.target.value);
      onChange?.(e);
    },
    [onChange],
  );

  return { value: local, onChange: handleChange };
}
