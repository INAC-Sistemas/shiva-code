---
name: react-ui-patterns
description: Build every async React screen with complete, animated UI states — loading only without data, skeletons shaped like the content, errors always surfaced with retry, empty states with one next action, disabled triggers with progress, optimistic updates with rollback — using shadcn/ui, sonner toasts and motion.
whenToUse: Whenever a React component fetches or mutates data, renders a list or collection, submits a form, or shows loading, error or empty states, and when /07-build briefs or evaluates a UI ticket that touches data.
---

# React UI patterns

Every screen that touches data has five states: loading, error, empty, success and in-flight action. Each is designed, reachable and animated. Standard controls come from shadcn/ui (`/shadcn-ui`), colors from palette roles (`/ui-palette`), icons from `/ui-icons`, motion from the tokens in `03-design.md` (`/frontend-design`).

## Principles

1. **Never show stale spinners** — a loading indicator only when there is nothing to show.
2. **Always surface errors** — the user knows when something failed and what they can do.
3. **Feel instant** — optimistic updates for low-risk mutations, with rollback.
4. **Progressive disclosure** — render what is ready; stream the rest.
5. **Partial data beats no data** — keep showing the last good data under a banner.
6. **States transition, not snap** — content fades in, items enter and leave, errors slide in.

## Data layer

Use the query library recorded in `04-tech-plan.md` (TanStack Query below; SWR is equivalent). Never fetch in a raw `useEffect` + `useState` pair: it has no cache, deduplication, retry or cancellation.

## Loading

**Golden rule: show loading only when there is no data.**

```tsx
const { data, isPending, isError, error, refetch, isFetching } = useQuery({ queryKey: ['items'], queryFn: fetchItems });

if (isError && !data) return <ErrorState error={error} onRetry={() => refetch()} />;
if (isPending) return <ItemsSkeleton />;
if (data.length === 0) return <ItemsEmpty onCreate={openCreate} />;

return <ItemList items={data} refreshing={isFetching} />;
```

```tsx
// WRONG — flashes a spinner over cached data on every refetch
if (isFetching) return <Spinner />;
```

Decision order: error without data → error state; no data yet → skeleton; data but empty → empty state; data → content (background refetch shows at most a subtle indicator).

| Skeleton | Spinner |
|---|---|
| Known content shape: lists, cards, tables, page load | Unknown shape, button submissions, inline actions, dialogs |

- Skeletons mirror the real layout (same heights, same grid) so nothing jumps, built from shadcn `Skeleton` (`animate-pulse`, or the shimmer in `/tailwind-patterns`).
- Delay a skeleton ~150ms for fast responses to avoid a flash; never delay an error.
- When data arrives, content fades in over `--duration-base`:

```tsx
<AnimatePresence mode="wait" initial={false}>
  {isPending ? (
    <motion.div key="skeleton" exit={{ opacity: 0 }} transition={{ duration: 0.15 }}><ItemsSkeleton /></motion.div>
  ) : (
    <motion.ul key="list" initial="hidden" animate="show" variants={{ show: { transition: { delayChildren: stagger(0.05) } } }}>
      {data.map(item => (
        <motion.li key={item.id} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>…</motion.li>
      ))}
    </motion.ul>
  )}
</AnimatePresence>
```

## Errors

**Never swallow an error.** Pick the level by scope:

| Level | Use | Component |
|---|---|---|
| Inline | Field validation | shadcn `Form` / `Field` message under the field |
| Toast | Recoverable action failure, retry possible | `sonner` `toast.error` with an action |
| Banner | Page partly usable (stale data, one widget failed) | shadcn `Alert` above the affected area |
| Full state | Nothing usable | `ErrorState` with retry |

```tsx
function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <motion.div role="alert" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-3 py-16 text-center">
      <CircleAlert className="size-8 text-destructive" aria-hidden />
      <h3 className="font-display text-lg text-balance">Could not load the items</h3>
      <p className="max-w-prose text-sm text-muted-foreground text-pretty">{error.message}</p>
      {onRetry ? <Button variant="outline" onClick={onRetry}>Try again</Button> : null}
    </motion.div>
  );
}
```

Visible strings are in the requester's language; the English above is illustrative. Log the technical error for developers, show a human message to users.

```tsx
// WRONG — the user sees nothing
try { await save(values) } catch (e) { console.error(e) }
```

## Actions and buttons

**Disable the trigger during the operation and show progress in place.** shadcn `Button` has no `isLoading` prop — compose it:

```tsx
const mutation = useMutation({
  mutationFn: createItem,
  onSuccess: () => { toast.success('Item created'); queryClient.invalidateQueries({ queryKey: ['items'] }); },
  onError: (_error, variables) => toast.error('Could not create the item', { action: { label: 'Retry', onClick: () => mutation.mutate(variables) } }),
});

<Button type="submit" disabled={!isValid || mutation.isPending} aria-busy={mutation.isPending}>
  {mutation.isPending ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
  Save
</Button>
```

- Use the registry's `spinner` component when `pnpm dlx shadcn@latest search @shadcn -q spinner` finds it; otherwise the icon above.
- Keep the button width stable while loading (the label stays).
- A disabled submit explains why (helper text), per `/fixing-accessibility`.
- Destructive actions confirm through `AlertDialog` (`/baseline-ui`).

## Optimistic updates

For low-risk mutations (toggle, rename, reorder, like):

```tsx
useMutation({
  mutationFn: toggleDone,
  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: ['items'] });
    const previous = queryClient.getQueryData<Item[]>(['items']);
    queryClient.setQueryData<Item[]>(['items'], items => items?.map(i => i.id === id ? { ...i, done: !i.done } : i));
    return { previous };
  },
  onError: (_e, _id, ctx) => { queryClient.setQueryData(['items'], ctx?.previous); toast.error('Change not saved'); },
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['items'] }),
});
```

Items added or removed optimistically enter and exit through `AnimatePresence` (`initial={{ opacity: 0, y: 8 }}`, `exit={{ opacity: 0, x: -16 }}`, `layout` on small lists).

## Empty states

**Every collection has an empty state with one clear next action.** Use the registry's `empty` component when `search` finds it; otherwise compose:

| Context | Content |
|---|---|
| Nothing created yet | Icon, a sentence on what will appear here, primary action "Create first item" |
| Search/filter with no results | What was searched, action "Clear filters" |
| No permission | Why, and who can grant access |

The empty state enters with the same fade + translate as content.

## Forms

- Validate with the project's schema (zod + shadcn `Form`/`Field`); show field errors inline on blur and on submit, focus the first invalid field.
- Submit disables and shows progress; success gives feedback (toast or transition to the next screen); failure keeps the values.
- Never block paste; label every field.

## Checklist

**States**
- [ ] Error state shown and reachable, with retry where it makes sense.
- [ ] Skeleton only without data, shaped like the content.
- [ ] Empty state with one next action for every collection.
- [ ] Triggers disabled with progress during async actions.

**Feedback and motion**
- [ ] Every mutation has success and error feedback.
- [ ] Content, list items, errors and empty states animate in with the tokens; removals animate out.
- [ ] Reduced motion keeps every state visible.

**Validation in the prototype**
- [ ] Each state has a labeled demo control ("simular erro", "simular vazio") so the requester can trigger it, per `/03-prototype`.

_Adapted from the community `react-ui-patterns` skill._
