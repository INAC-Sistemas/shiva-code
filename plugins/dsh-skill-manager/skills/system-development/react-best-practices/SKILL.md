---
name: react-best-practices
description: Write fast React and Next.js code by Vercel's 45 performance rules ranked by impact — eliminate async waterfalls, cut bundle size, server-side caching and serialization (Next.js), cached client fetching, fewer re-renders, cheaper rendering and JavaScript hot paths — each with the incorrect and correct pattern.
whenToUse: Whenever React components, hooks, data fetching, routes or Server Components are written, reviewed or refactored, when a screen is slow or the bundle is large, and when /07-build briefs or evaluates a ticket that touches React code.
---

# React best practices

Rules in impact order. Apply CRITICAL and HIGH by default; apply the rest where the code is hot (lists, frequent events, large data). Sections marked **Next.js** apply only when `04-tech-plan.md` chose a server-rendering template (`next`, `start`); the default Vite SPA skips them.

If the project enables React Compiler, manual `memo`, `useMemo`, `useCallback` and JSX hoisting are unnecessary; the correctness rules (functional setState, `toSorted`, conditional rendering) still apply.

## 1. Eliminate waterfalls — CRITICAL

**1.1 Parallelize independent work.** Each sequential `await` adds a full round trip.

```ts
// wrong
const user = await fetchUser(); const posts = await fetchPosts();
// right
const [user, posts] = await Promise.all([fetchUser(), fetchPosts()]);
```

**1.2 Start early, await late** when some work depends on other work:

```ts
const sessionP = auth();                 // starts now
const configP = fetchConfig();           // starts now, independent
const session = await sessionP;
const [config, data] = await Promise.all([configP, fetchData(session.user.id)]);
```

**1.3 Defer `await` into the branch that needs it.** Return early before fetching what an early-exit path never uses.

**1.4 Suspense boundaries stream the rest.** Wrap only the slow part so the shell renders at once. **Next.js**: async Server Components inside `<Suspense fallback={<Skeleton />}>`. **Client**: `useSuspenseQuery` or `use(promise)` inside `<Suspense>`; share one promise between siblings instead of fetching twice. Do not suspend what decides layout or above-the-fold SEO content.

## 2. Bundle size — CRITICAL

**2.1 Split heavy components.** Editors, charts, maps, 3D, rich text load on demand:

```tsx
// Vite / client
const Chart = lazy(() => import('./revenue-chart'));
<Suspense fallback={<Skeleton className="h-72" />}><Chart data={data} /></Suspense>
// Next.js
const Chart = dynamic(() => import('./revenue-chart'), { ssr: false, loading: () => <Skeleton className="h-72" /> });
```

Split routes too (`lazy` route components in React Router / TanStack Router; automatic in Next.js).

**2.2 Barrel imports.** Import icons by name as `/ui-icons` requires; Vite's production build tree-shakes them, and Next.js optimizes `lucide-react`, `@tabler/icons-react`, `date-fns`, `lodash-es` and similar by default — add other barrel-heavy packages to `experimental.optimizePackageImports`. For your own code, avoid `index.ts` files that re-export whole folders into client bundles.

**2.3 Load conditionally.** Import large modules or data only when the feature is activated (`import('./frames').then(...)` inside the handler or effect that needs it).

**2.4 Defer third parties.** Analytics, logging and chat widgets load after the app is interactive (dynamic import after mount, or `next/script` `strategy="lazyOnload"`).

**2.5 Preload on intent.** `onMouseEnter` / `onFocus` of the trigger calls `void import('./editor')` so the click feels instant.

## 3. Server side — HIGH (Next.js)

**3.1 Composition parallelizes Server Components.** A parent that awaits before rendering children makes them wait; give each async component its own fetch and render them as siblings.

**3.2 Pass only what the client uses** across the server/client boundary: `<Profile name={user.name} />`, not the 50-field `user` object — everything passed is serialized into the HTML.

**3.3 `React.cache()`** deduplicates a function within one request (current user, permissions). **Cross-request** reuse needs an LRU (`lru-cache`) or a shared cache such as Redis.

**3.4 `after()`** runs logging, analytics and notifications after the response is sent.

## 4. Client data fetching — MEDIUM-HIGH

**4.1 Use a query cache** (TanStack Query or SWR, per `04-tech-plan.md`) for deduplication, caching, retries and revalidation. Never `useEffect(() => { fetch().then(setState) }, [])`.

**4.2 One global listener, many subscribers.** Register `keydown`, `resize` or `storage` once at module level and fan out to a `Set` of callbacks, instead of one listener per component instance.

## 5. Re-renders — MEDIUM

- **5.1 Read on demand.** Do not subscribe to state (search params, storage) that is only read inside a callback; read it in the callback.
- **5.2 Memoize expensive subtrees** into `memo` components so early returns (loading) skip the work.
- **5.3 Primitive effect dependencies**: `[user.id]`, not `[user]`; derive booleans before the effect (`const isMobile = width < 768`).
- **5.4 Subscribe to derived state**: `useMediaQuery('(max-width: 767px)')` instead of a width that changes every pixel.
- **5.5 Functional setState** in callbacks: `setItems(curr => [...curr, item])` — stable callbacks, no stale closures.
- **5.6 Lazy initial state**: `useState(() => JSON.parse(localStorage.getItem('k') ?? '{}'))`.
- **5.7 Transitions for non-urgent updates**: `startTransition(() => setFilter(v))` for filtering, tab content and scroll-derived state; `useDeferredValue` for a slow list behind a fast input.
- **Motion values do not re-render**: drive scroll- or pointer-linked animation with `useScroll` / `useMotionValue` / `useTransform` from `motion/react`, never with `useState` updated per frame.

## 6. Rendering — MEDIUM

- **6.1 Animate a wrapper, not the `<svg>`**, so the browser can composite it.
- **6.2 `content-visibility: auto`** with `contain-intrinsic-size` on long list items; virtualize (`@tanstack/react-virtual`) beyond a few hundred rows.
- **6.3 Hoist static JSX** (large SVGs, constant skeletons) outside the component.
- **6.4 Trim SVG precision** to one decimal (`svgo --precision=1`).
- **6.5 No theme flash.** Client-only preferences (theme, dark mode) are applied by a tiny inline script in `index.html` / the root layout before React renders — not in `useEffect`, which flashes the default first.
- **6.6 `<Activity mode={open ? 'visible' : 'hidden'}>`** (React 19.2+) keeps state and DOM of expensive panels that toggle often.
- **6.7 Explicit conditionals**: `{count > 0 ? <Badge>{count}</Badge> : null}`, never `{count && …}`, which renders `0`.

## 7. JavaScript hot paths — LOW-MEDIUM

- **7.1** Change styles through classes or one `cssText` write, not property by property.
- **7.2** Build a `Map` for repeated lookups by id instead of `.find` inside `.map`.
- **7.3** Cache deep property access and `length` outside tight loops.
- **7.4** Cache pure function results in a module-level `Map` (slugify, formatters).
- **7.5** Cache `localStorage` / `document.cookie` reads in memory; invalidate on the `storage` event and on `visibilitychange`.
- **7.6** Combine several `.filter`/`.map` passes into one loop when the array is large.
- **7.7** Compare lengths before sorting or deep-comparing arrays.
- **7.8** Return early once the result is known.
- **7.9** Hoist `RegExp` creation out of render and loops; beware `lastIndex` on global regexes.
- **7.10** Find min/max with one loop, not a sort.
- **7.11** `Set`/`Map` for membership checks.
- **7.12** `toSorted()`, `toReversed()`, `toSpliced()`, `with()` — never mutate props or state with `sort()`.

## 8. Advanced — LOW

- **8.1 Stable event subscriptions**: `useEffectEvent(handler)` (React 19.2+) inside effects that must not re-subscribe when the handler changes.
- **8.2 Latest-value ref** for older React: `const ref = useRef(fn); useLayoutEffect(() => { ref.current = fn })`, then call `ref.current()` inside a stable effect.

## Review guidance

- Report CRITICAL and HIGH findings first, each with the incorrect snippet quoted and the corrected code.
- Measure before optimizing low-impact rules: React DevTools Profiler for re-renders, the build's bundle report (`vite build` + `rollup-plugin-visualizer`, or `@next/bundle-analyzer`) for size.
- Do not trade correctness or accessibility for micro-optimizations.

_Adapted from Vercel Engineering's React Best Practices (vercel-labs agent skills)._
