---
name: ui-ux-pro-max
description: Choose a product's design system from a built-in catalog — style, landing pattern, color mood, signature effects and font pairing for 96 product types, 57 styles, 57 font pairings and 27 landing patterns — and check UI against prioritized UX rules and a pre-delivery checklist.
whenToUse: When /frontend-design decides a direction (start of /03-prototype), when /ui-palette needs the color mood of the product type, when a landing page, dashboard or new product UI is designed, and when UI is reviewed for UX quality.
---

# UI/UX Pro Max

A design-intelligence catalog. It recommends; `/frontend-design` commits the direction and records it in `03-design.md`, `/ui-palette` turns the color mood into the requester's palette, and icons stay with `/ui-icons`. Everything needed is in this file — there is no script or data directory to run.

## Workflow

1. **Classify** from `01-brief.md` or the request: product type, audience, industry, tone keywords, stack (prototype HTML + Tailwind CDN, or React + shadcn).
2. **Product row** — find the closest row in [Products](#products): style, landing pattern, color mood, signature effects. Two close rows: combine, keeping one dominant style.
3. **Style row** — read the chosen style in [Styles](#styles): its effects become motion and depth decisions, "Not for" is a veto, the accessibility column is a warning to act on.
4. **Font pairing** — pick from [Typography](#typography) by mood and "best for". Match the script of the requester's language (the Noto rows cover CJK, Arabic, Thai, Hebrew; Vietnamese needs Be Vietnam Pro or Noto).
5. **Landing pattern** — for marketing pages, follow the section order and CTA placement in [Landing patterns](#landing-patterns).
6. **Hand over** — the style, pairing, pattern and effects go to `/frontend-design` (section 1), the color mood to `/ui-palette` (section 1). Apply the [UX rules](#ux-rules) while building and run the [checklist](#pre-delivery-checklist) before delivery.

Recommendations are starting points. When the brief contradicts a row (a playful bank, a sober game), the brief wins; say which row you departed from and why.

## UX rules

Priority order; CRITICAL and HIGH violations are defects.

**1. Accessibility — CRITICAL**
- `color-contrast`: 4.5:1 body text, 3:1 large text and UI boundaries (measured per `/ui-palette`).
- `focus-states`: visible focus ring on every interactive element.
- `alt-text`: meaningful alt, or `alt=""` for decoration.
- `aria-labels`: icon-only buttons are labeled.
- `keyboard-nav`: tab order follows visual order.
- `form-labels`: every field has a `<label>`.
Full rules: `/fixing-accessibility`.

**2. Touch and interaction — CRITICAL**
- `touch-target-size`: at least 44×44px.
- `hover-vs-tap`: primary actions work by click/tap; hover only adds.
- `loading-buttons`: disable and show progress during async actions.
- `error-feedback`: message next to the problem.
- `cursor-pointer`: on every clickable element that is not a native button or link.

**3. Performance — HIGH**
- `image-optimization`: WebP/AVIF, `srcset`, `loading="lazy"` below the fold, explicit width/height.
- `reduced-motion`: honor `prefers-reduced-motion`.
- `content-jumping`: reserve space for async content and images.

**4. Layout and responsive — HIGH**
- `viewport-meta`: `width=device-width, initial-scale=1`.
- `readable-font-size`: 16px minimum body text on mobile.
- `horizontal-scroll`: none at 375px.
- `z-index-management`: fixed scale (10/20/30/40/50).
- Floating navbar keeps distance from edges (`top-4 inset-x-4`); content never hides behind fixed bars; one max width per product.

**5. Typography and color — MEDIUM**
- `line-height`: 1.5–1.75 body.
- `line-length`: 65–75 characters.
- `font-pairing`: heading and body personalities match the style.
- Muted text still passes contrast; glass cards in light mode stay at `bg-card/80` or more opaque; borders visible in both modes.

**6. Animation — MEDIUM (required in this flow)**
- Every page has entrance, reveal, feedback and state-change motion (`/frontend-design` section 3).
- `duration-timing`: 150–300ms micro-interactions, 400–700ms entrances.
- `transform-performance`: transform/opacity, not width/height (`/fixing-motion-performance`).
- `loading-states`: skeletons for known shapes, spinners for actions.
- Hover never shifts surrounding layout: use transform, shadow or color, not size or margin.

**7. Style selection — MEDIUM**
- `style-match`: style fits the product type and audience.
- `consistency`: one style across every page.
- `no-emoji-icons`: icons from `/ui-icons`, brand logos from their official SVG (Simple Icons).

**8. Charts and data — LOW**
- Chart type matches the data (trend → line/area, comparison → bar, part-to-whole → stacked bar or donut with 5 slices or fewer, distribution → histogram, correlation → scatter).
- Series colors from `chart-1…chart-5`; never color alone — add labels, patterns or direct annotations.
- Offer a table alternative for important charts.

## Pre-delivery checklist

**Visual quality**
- [ ] No emoji as icons; one icon pack; correct brand logos.
- [ ] Every color from palette roles; fonts and scale from `03-design.md`.
- [ ] Hover states give clear feedback without layout shift.

**Motion**
- [ ] Entrance on every screen, reveal on scrolled sections, feedback on every control, transitions on state changes.
- [ ] Feedback 100–200ms, entrances 400–700ms, using the motion tokens.
- [ ] Reduced motion keeps content and state, drops movement.

**Interaction**
- [ ] `cursor-pointer` on clickable non-native elements; focus visible.
- [ ] Async actions disable their trigger and show progress.

**Light and dark**
- [ ] Text contrast 4.5:1 in both; glass and translucent surfaces readable in light mode; borders visible in both.

**Layout**
- [ ] Works at 375, 768, 1024, 1440px; no horizontal scroll; nothing hidden behind fixed bars.

**Accessibility**
- [ ] Alt text, labeled inputs, color never the only signal.

## Font loading notes

- Fonts in the tables are on Google Fonts except **Satoshi, General Sans and Clash Display** (Fontshare, `https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap`). When only Google Fonts is acceptable, use Outfit or DM Sans instead.
- Prototype: Google Fonts `<link>` with `preconnect` and `display=swap`. React app: `@fontsource` / `@fontsource-variable` packages, or the same `<link>` in `index.html`.
- Load only the weights used (usually 400, 500, 600/700); prefer variable fonts.

## Products

Recommended style, landing pattern, color mood and signature effects per product type.

| Product | Style | Landing pattern | Color mood | Signature effects |
|---|---|---|---|---|
| SaaS (General) | Glassmorphism + Flat Design | Hero + Features + CTA | Trust blue + Accent contrast | Subtle hover (200-250ms) + Smooth transitions |
| Micro SaaS | Flat Design + Vibrant & Block | Minimal & Direct + Demo | Vibrant primary + White space | Large CTA hover (300ms) + Scroll reveal |
| E-commerce | Vibrant & Block-based | Feature-Rich Showcase | Brand primary + Success green | Card hover lift (200ms) + Scale effect |
| E-commerce Luxury | Liquid Glass + Glassmorphism | Feature-Rich Showcase | Premium colors + Minimal accent | Chromatic aberration + Fluid animations (400-600ms) |
| Service Landing Page | Hero-Centric + Trust & Authority | Hero-Centric Design | Brand primary + Trust colors | Testimonial carousel + CTA hover (200ms) |
| B2B Service | Trust & Authority + Minimal | Feature-Rich Showcase | Professional blue + Neutral grey | Section transitions + Feature reveals |
| Financial Dashboard | Dark Mode (OLED) + Data-Dense | N/A - Dashboard focused | Dark bg + Red/Green alerts + Trust blue | Real-time number animations + Alert pulse |
| Analytics Dashboard | Data-Dense + Heat Map & Heatmap | N/A - Analytics focused | Cool→Hot gradients + Neutral grey | Hover tooltips + Chart zoom + Filter animations |
| Healthcare App | Neumorphism + Accessible & Ethical | Social Proof-Focused | Calm blue + Health green | Soft box-shadow + Smooth press (150ms) |
| Educational App | Claymorphism + Micro-interactions | Storytelling-Driven | Playful colors + Clear hierarchy | Soft press (200ms) + Fluffy elements |
| Creative Agency | Brutalism + Motion-Driven | Storytelling-Driven | Bold primaries + Artistic freedom | CRT scanlines + Neon glow + Glitch effects |
| Portfolio/Personal | Motion-Driven + Minimalism | Storytelling-Driven | Brand primary + Artistic | Parallax (3-5 layers) + Scroll-triggered reveals |
| Gaming | 3D & Hyperrealism + Retro-Futurism | Feature-Rich Showcase | Vibrant + Neon + Immersive | WebGL 3D rendering + Glitch effects |
| Government/Public Service | Accessible & Ethical + Minimalism | Minimal & Direct | Professional blue + High contrast | Clear focus rings (3-4px) + Skip links |
| Fintech/Crypto | Glassmorphism + Dark Mode (OLED) | Conversion-Optimized | Dark tech colors + Vibrant accents | Real-time chart animations + Alert pulse/glow |
| Social Media App | Vibrant & Block-based + Motion-Driven | Feature-Rich Showcase | Vibrant + Engagement colors | Large scroll animations + Icon animations |
| Productivity Tool | Flat Design + Micro-interactions | Interactive Product Demo | Clear hierarchy + Functional colors | Quick actions (150ms) + Task animations |
| Design System/Component Library | Minimalism + Accessible & Ethical | Feature-Rich Showcase | Clear hierarchy + Code-like structure | Code copy animations + Component previews |
| AI/Chatbot Platform | AI-Native UI + Minimalism | Interactive Product Demo | Neutral + AI Purple (#6366F1) | Streaming text + Typing indicators + Fade-in |
| NFT/Web3 Platform | Cyberpunk UI + Glassmorphism | Feature-Rich Showcase | Dark + Neon + Gold (#FFD700) | Wallet connect animations + Transaction feedback |
| Creator Economy Platform | Vibrant & Block-based + Bento Box Grid | Social Proof-Focused | Vibrant + Brand colors | Engagement counter animations + Profile reveals |
| Sustainability/ESG Platform | Organic Biophilic + Minimalism | Trust & Authority | Green (#228B22) + Earth tones | Progress indicators + Impact animations |
| Remote Work/Collaboration Tool | Soft UI Evolution + Minimalism | Feature-Rich Showcase | Calm Blue + Neutral grey | Real-time presence indicators + Notification badges |
| Mental Health App | Neumorphism + Accessible & Ethical | Social Proof-Focused | Calm Pastels + Trust colors |  |
| Pet Tech App | Claymorphism + Vibrant & Block-based | Storytelling-Driven | Playful + Warm colors | Pet profile animations + Health tracking charts |
| Smart Home/IoT Dashboard | Glassmorphism + Dark Mode (OLED) | Interactive Product Demo | Dark + Status indicator colors | Device status pulse + Quick action animations |
| EV/Charging Ecosystem | Minimalism + Aurora UI | Hero-Centric Design | Electric Blue (#009CD1) + Green | Range estimation animations + Map interactions |
| Subscription Box Service | Vibrant & Block-based + Motion-Driven | Feature-Rich Showcase | Brand + Excitement colors | Unboxing reveal animations + Product carousel |
| Podcast Platform | Dark Mode (OLED) + Minimalism | Storytelling-Driven | Dark + Audio waveform accents | Waveform visualizations + Episode transitions |
| Dating App | Vibrant & Block-based + Motion-Driven | Social Proof-Focused | Warm + Romantic (Pink/Red gradients) | Profile card swipe + Match animations |
| Micro-Credentials/Badges Platform | Minimalism + Flat Design | Trust & Authority | Trust Blue + Gold (#FFD700) | Badge reveal animations + Progress tracking |
| Knowledge Base/Documentation | Minimalism + Accessible & Ethical | FAQ/Documentation | Clean hierarchy + Minimal color | Search highlight + Smooth scrolling |
| Hyperlocal Services | Minimalism + Vibrant & Block-based | Conversion-Optimized | Location markers + Trust colors | Map hover + Provider card reveals |
| Beauty/Spa/Wellness Service | Soft UI Evolution + Neumorphism | Hero-Centric Design + Social Proof | Soft pastels (Pink Sage Cream) + Gold accents | Soft shadows + Smooth transitions (200-300ms) + Gentle hover |
| Luxury/Premium Brand | Liquid Glass + Glassmorphism | Storytelling-Driven + Feature-Rich | Black + Gold (#FFD700) + White | Slow parallax + Premium reveals (400-600ms) |
| Restaurant/Food Service | Vibrant & Block-based + Motion-Driven | Hero-Centric Design + Conversion | Warm colors (Orange Red Brown) | Food image reveal + Menu hover effects |
| Fitness/Gym App | Vibrant & Block-based + Dark Mode (OLED) | Feature-Rich Showcase | Energetic (Orange #FF6B35) + Dark bg | Progress ring animations + Achievement unlocks |
| Real Estate/Property | Glassmorphism + Minimalism | Hero-Centric Design + Feature-Rich | Trust Blue + Gold + White | 3D property tour zoom + Map hover |
| Travel/Tourism Agency | Aurora UI + Motion-Driven | Storytelling-Driven + Hero-Centric | Vibrant destination + Sky Blue | Destination parallax + Itinerary animations |
| Hotel/Hospitality | Liquid Glass + Minimalism | Hero-Centric Design + Social Proof | Warm neutrals + Gold (#D4AF37) | Room gallery + Amenity reveals |
| Wedding/Event Planning | Soft UI Evolution + Aurora UI | Storytelling-Driven + Social Proof | Soft Pink (#FFD6E0) + Gold + Cream | Gallery reveals + Timeline animations |
| Legal Services | Trust & Authority + Minimalism | Trust & Authority + Minimal | Navy Blue (#1E3A5F) + Gold + White | Practice area reveal + Attorney profile animations |
| Insurance Platform | Trust & Authority + Flat Design | Conversion-Optimized + Trust | Trust Blue (#0066CC) + Green + Neutral | Quote calculator animations + Policy comparison |
| Banking/Traditional Finance | Minimalism + Accessible & Ethical | Trust & Authority + Feature-Rich | Navy (#0A1628) + Trust Blue + Gold | Smooth number animations + Security indicators |
| Online Course/E-learning | Claymorphism + Vibrant & Block-based | Feature-Rich Showcase + Social Proof | Vibrant learning colors + Progress green | Progress bar animations + Certificate reveals |
| Non-profit/Charity | Accessible & Ethical + Organic Biophilic | Storytelling-Driven + Trust | Cause-related colors + Trust + Warm | Impact counter animations + Story reveals |
| Music Streaming | Dark Mode (OLED) + Vibrant & Block-based | Feature-Rich Showcase | Dark (#121212) + Vibrant accents + Album art colors |  |
| Video Streaming/OTT | Dark Mode (OLED) + Motion-Driven | Hero-Centric Design + Feature-Rich | Dark bg + Poster colors + Brand accent | Video player animations + Content carousel (parallax) |
| Job Board/Recruitment | Flat Design + Minimalism | Conversion-Optimized + Feature-Rich | Professional Blue + Success Green + Neutral | Search/filter animations + Application flow |
| Marketplace (P2P) | Vibrant & Block-based + Flat Design | Feature-Rich Showcase + Social Proof | Trust colors + Category colors + Success green | Review star animations + Listing hover effects |
| Logistics/Delivery | Minimalism + Flat Design | Feature-Rich Showcase + Conversion | Blue (#2563EB) + Orange (tracking) + Green | Real-time tracking animation + Status pulse |
| Agriculture/Farm Tech | Organic Biophilic + Flat Design | Feature-Rich Showcase + Trust | Earth Green (#4A7C23) + Brown + Sky Blue | Data visualization + Weather animations |
| Construction/Architecture | Minimalism + 3D & Hyperrealism | Hero-Centric Design + Feature-Rich | Grey (#4A4A4A) + Orange (safety) + Blueprint Blue | 3D model viewer + Timeline animations |
| Automotive/Car Dealership | Motion-Driven + 3D & Hyperrealism | Hero-Centric Design + Feature-Rich | Brand colors + Metallic + Dark/Light | 360 product view + Configurator animations |
| Photography Studio | Motion-Driven + Minimalism | Storytelling-Driven + Hero-Centric | Black + White + Minimal accent | Full-bleed gallery + Before/after reveal |
| Coworking Space | Vibrant & Block-based + Glassmorphism | Hero-Centric Design + Feature-Rich | Energetic colors + Wood tones + Brand | Space tour video + Amenity reveal animations |
| Cleaning Service | Soft UI Evolution + Flat Design | Conversion-Optimized + Trust | Fresh Blue (#00B4D8) + Clean White + Green | Before/after gallery + Service package reveal |
| Home Services (Plumber/Electrician) | Flat Design + Trust & Authority | Conversion-Optimized + Trust | Trust Blue + Safety Orange + Grey | Emergency contact highlight + Service menu animations |
| Childcare/Daycare | Claymorphism + Vibrant & Block-based | Social Proof-Focused + Trust | Playful pastels + Safe colors + Warm | Parent portal animations + Activity gallery reveal |
| Senior Care/Elderly | Accessible & Ethical + Soft UI Evolution | Trust & Authority + Social Proof | Calm Blue + Warm neutrals + Large text | Large touch targets + Clear navigation |
| Medical Clinic | Accessible & Ethical + Minimalism | Trust & Authority + Conversion | Medical Blue (#0077B6) + Trust White | Online booking flow + Doctor profile reveals |
| Pharmacy/Drug Store | Flat Design + Accessible & Ethical | Conversion-Optimized + Trust | Pharmacy Green + Trust Blue + Clean White | Prescription upload flow + Refill reminders |
| Dental Practice | Soft UI Evolution + Minimalism | Social Proof-Focused + Conversion | Fresh Blue + White + Smile Yellow | Before/after gallery + Patient testimonial carousel |
| Veterinary Clinic | Claymorphism + Accessible & Ethical | Social Proof-Focused + Trust | Caring Blue + Pet colors + Warm | Pet profile management + Service animations |
| Florist/Plant Shop | Organic Biophilic + Vibrant & Block-based | Hero-Centric Design + Conversion | Natural Green + Floral pinks/purples | Product reveal + Seasonal transitions |
| Bakery/Cafe | Vibrant & Block-based + Soft UI Evolution | Hero-Centric Design + Conversion | Warm Brown + Cream + Appetizing accents | Menu hover + Order animations |
| Coffee Shop | Minimalism + Organic Biophilic | Hero-Centric Design + Conversion | Coffee Brown (#6F4E37) + Cream + Warm | Menu transitions + Loyalty animations |
| Brewery/Winery | Motion-Driven + Storytelling-Driven | Storytelling-Driven + Hero-Centric | Deep amber/burgundy + Gold + Craft | Tasting note reveals + Heritage timeline |
| Airline | Minimalism + Glassmorphism | Conversion-Optimized + Feature-Rich | Sky Blue + Brand colors + Trust | Flight search animations + Boarding pass reveals |
| News/Media Platform | Minimalism + Flat Design | Hero-Centric Design + Feature-Rich | Brand colors + High contrast | Breaking news badge + Article reveal animations |
| Magazine/Blog | Swiss Modernism 2.0 + Motion-Driven | Storytelling-Driven + Hero-Centric | Editorial colors + Brand + Clean white | Article transitions + Category reveals |
| Freelancer Platform | Flat Design + Minimalism | Feature-Rich Showcase + Conversion | Professional Blue + Success Green | Skill match animations + Review reveals |
| Consulting Firm | Trust & Authority + Minimalism | Trust & Authority + Feature-Rich | Navy + Gold + Professional grey | Case study reveals + Team profiles |
| Marketing Agency | Brutalism + Motion-Driven | Storytelling-Driven + Feature-Rich | Bold brand colors + Creative freedom | Portfolio reveals + Results animations |
| Event Management | Vibrant & Block-based + Motion-Driven | Hero-Centric Design + Feature-Rich | Event theme colors + Excitement accents | Countdown timer + Registration flow |
| Conference/Webinar Platform | Glassmorphism + Minimalism | Feature-Rich Showcase + Conversion | Professional Blue + Video accent | Live stream integration + Agenda transitions |
| Membership/Community | Vibrant & Block-based + Soft UI Evolution | Social Proof-Focused + Conversion | Community brand colors + Engagement | Member counter + Benefit reveals |
| Newsletter Platform | Minimalism + Flat Design | Minimal & Direct + Conversion | Brand primary + Clean white + CTA | Subscribe form + Archive reveals |
| Digital Products/Downloads | Vibrant & Block-based + Motion-Driven | Feature-Rich Showcase + Conversion | Product colors + Brand + Success green | Product preview + Instant delivery animations |
| Church/Religious Organization | Accessible & Ethical + Soft UI Evolution | Hero-Centric Design + Social Proof | Warm Gold + Deep Purple/Blue + White | Service time highlights + Event calendar |
| Sports Team/Club | Vibrant & Block-based + Motion-Driven | Hero-Centric Design + Feature-Rich | Team colors + Energetic accents | Score animations + Schedule reveals |
| Museum/Gallery | Minimalism + Motion-Driven | Storytelling-Driven + Feature-Rich | Art-appropriate neutrals + Exhibition accents | Virtual tour + Collection reveals |
| Theater/Cinema | Dark Mode (OLED) + Motion-Driven | Hero-Centric Design + Conversion | Dark + Spotlight accents + Gold | Seat selection + Trailer reveals |
| Language Learning App | Claymorphism + Vibrant & Block-based | Feature-Rich Showcase + Social Proof | Playful colors + Progress indicators | Progress animations + Achievement unlocks |
| Coding Bootcamp | Dark Mode (OLED) + Minimalism | Feature-Rich Showcase + Social Proof | Code editor colors + Brand + Success | Terminal animations + Career outcome reveals |
| Cybersecurity Platform | Cyberpunk UI + Dark Mode (OLED) | Trust & Authority + Real-Time | Matrix Green (#00FF00) + Deep Black | Threat visualization + Alert animations |
| Developer Tool / IDE | Dark Mode (OLED) + Minimalism | Minimal & Direct + Documentation | Dark syntax theme + Blue focus | Syntax highlighting + Command palette |
| Biotech / Life Sciences | Glassmorphism + Clean Science | Storytelling-Driven + Research | Sterile White + DNA Blue + Life Green | Data visualization + Research reveals |
| Space Tech / Aerospace | Holographic / HUD + Dark Mode | Immersive Experience + Hero | Deep Space Black + Star White + Metallic | Telemetry animations + 3D renders |
| Architecture / Interior | Exaggerated Minimalism + High Imagery | Portfolio Grid + Visuals | Monochrome + Gold Accent + High Imagery | Project gallery + Blueprint reveals |
| Quantum Computing Interface | Holographic / HUD + Dark Mode | Immersive/Interactive Experience | Quantum Blue (#00FFFF) + Deep Black | Probability visualizations + Qubit state animations |
| Biohacking / Longevity App | Biomimetic / Organic 2.0 | Data-Dense + Storytelling | Cellular Pink/Red + DNA Blue + White | Biological data viz + Progress animations |
| Autonomous Drone Fleet Manager | HUD / Sci-Fi FUI | Real-Time Monitor | Tactical Green + Alert Red + Map Dark | Telemetry animations + 3D spatial awareness |
| Generative Art Platform | Minimalism (Frame) + Gen Z Chaos | Bento Grid Showcase | Neutral (#F5F5F5) + User Content | Gallery masonry + Minting animations |
| Spatial Computing OS / App | Spatial UI (VisionOS) | Immersive/Interactive Experience | Frosted Glass + System Colors + Depth | Depth hierarchy + Gaze interactions |
| Sustainable Energy / Climate Tech | Organic Biophilic + E-Ink / Paper | Interactive Demo + Data | Earth Green + Sky Blue + Solar Yellow | Impact viz + Progress animations |

## Styles

| Style | Effects and motion | Best for | Not for | Accessibility |
|---|---|---|---|---|
| Minimalism & Swiss Style | Subtle hover (200-250ms), smooth transitions, sharp shadows if any | Enterprise apps, dashboards, documentation sites | Creative portfolios, entertainment, playful brands | ✓ WCAG AAA |
| Neumorphism | Soft box-shadow (multiple: -5px -5px 15px, 5px 5px 15px), smooth press (150ms) | Health/wellness apps, meditation platforms, fitness trackers | Complex apps, critical accessibility, data-heavy dashboards | ⚠ Low contrast |
| Glassmorphism | Backdrop blur (10-20px), subtle border (1px solid rgba white 0.2), light reflection | Modern SaaS, financial dashboards, high-end corporate | Low-contrast backgrounds, critical accessibility, performance-limited | ⚠ Ensure 4.5:1 |
| Brutalism | No smooth transitions (instant), sharp corners (0px), bold typography (700+) | Design portfolios, artistic projects, counter-culture brands | Corporate environments, conservative industries, critical accessibility | ✓ WCAG AAA |
| 3D & Hyperrealism | WebGL/Three.js 3D, realistic shadows (layers), physics lighting | Gaming, product showcase, immersive experiences | Low-end mobile, performance-limited, critical accessibility | ⚠ Not accessible |
| Vibrant & Block-based | Large sections (48px+ gaps), animated patterns, bold hover (color shift) | Startups, creative agencies, gaming | Financial institutions, healthcare, formal business | ◐ Ensure WCAG |
| Dark Mode (OLED) | Minimal glow (text-shadow: 0 0 10px), dark-to-light transitions, low white emission | Night-mode apps, coding platforms, entertainment | Print-first content, high-brightness outdoor, color-accuracy-critical | ✓ WCAG AAA |
| Accessible & Ethical | Clear focus rings (3-4px), ARIA labels, skip links | Government, healthcare, education | None - accessibility universal | ✓ WCAG AAA |
| Claymorphism | Inner+outer shadows (subtle, no hard lines), soft press (200ms ease-out) | Educational apps, children's apps, SaaS platforms | Formal corporate, professional services, data-critical | ⚠ Ensure 4.5:1 |
| Aurora UI | Large flowing CSS/SVG gradients, subtle 8-12s animations, depth via color layering | Modern SaaS, creative agencies, branding | Data-heavy dashboards, critical accessibility, content-heavy where distraction issues | ⚠ Text contrast |
| Retro-Futurism | CRT scanlines (::before overlay), neon glow (text-shadow+box-shadow), glitch effects (skew/offset keyframes) | Gaming, entertainment, music platforms | Conservative industries, critical accessibility, professional/corporate | ⚠ High contrast/strain |
| Flat Design | No gradients/shadows, simple hover (color/opacity shift), fast loading | Web apps, mobile apps, cross-platform | Complex 3D, premium/luxury, artistic portfolios | ✓ WCAG AAA |
| Skeuomorphism | Realistic shadows (layers), depth (perspective), texture details (noise | Legacy apps, gaming, immersive storytelling | Modern enterprise, critical accessibility, low-performance | ⚠ Textures reduce readability |
| Liquid Glass | Morphing elements (SVG/CSS), fluid animations (400-600ms curves), dynamic blur (backdrop-filter) | Premium SaaS, high-end e-commerce, creative platforms | Performance-limited, critical accessibility, complex data | ⚠ Text contrast |
| Motion-Driven | Scroll anim (Intersection Observer), hover (300-400ms), entrance | Portfolio sites, storytelling platforms, interactive experiences | Data dashboards, critical accessibility, low-power devices | ⚠ Prefers-reduced-motion |
| Micro-interactions | Small hover (50-100ms), loading spinners, success/error state anim | Mobile apps, touchscreen UIs, productivity tools | Desktop-only, critical performance, accessibility-first (alternatives needed) | ✓ Good |
| Inclusive Design | Haptic feedback (vibration), voice guidance, focus indicators (4px+ ring) | Public services, education, healthcare | None - accessibility universal | ✓ WCAG AAA |
| Zero Interface | Voice recognition UI, gesture detection, AI predictions (smooth reveal) | Voice assistants, AI platforms, future-forward UX | Complex workflows, data-entry heavy, traditional systems | ✓ Excellent |
| Soft UI Evolution | Improved shadows (softer than flat, clearer than neumorphism), modern (200-300ms) | Modern enterprise apps, SaaS platforms, health/wellness | Extreme minimalism, critical performance, systems without modern OS | ✓ WCAG AA+ |
| Hero-Centric Design | Smooth scroll reveal, fade-in animations on hero, subtle background parallax | SaaS landing pages, product launches, service landing pages | Complex navigation, multi-page experiences, data-heavy applications | ✓ WCAG AA |
| Conversion-Optimized | Hover states on CTA (color shift, slight scale), form field focus animations | E-commerce product pages, free trial signups, lead generation | Complex feature explanations, multi-product showcases, technical documentation | ✓ WCAG AA |
| Feature-Rich Showcase | Card hover effects (lift/scale), icon animations on scroll, feature toggle animations | Enterprise SaaS, software tools landing pages, platform services | Simple product pages, early-stage startups with few features, entertainment landing pages | ✓ WCAG AA |
| Minimal & Direct | Very subtle hover effects, minimal animations, fast page load (no heavy animations) | Simple service landing pages, indie products, consulting services | Feature-heavy products, complex explanations, multi-product showcases | ✓ WCAG AAA |
| Social Proof-Focused | Testimonial carousel animations, logo grid fade-in, stat counter animations (number count-up) | B2B SaaS, professional services, premium products | Startup MVPs, products without users, niche/experimental products | ✓ WCAG AA |
| Interactive Product Demo | Product animation playback, step progression animations, hover reveal effects | SaaS platforms, tool/software products, productivity apps landing pages | Simple services, consulting, non-digital products | ✓ WCAG AA |
| Trust & Authority | Badge hover effects, metric pulse animations, certificate carousel | Healthcare/medical landing pages, financial services, enterprise software | Casual products, entertainment, viral/social-first products | ✓ WCAG AAA |
| Storytelling-Driven | Section-to-section animations, scroll-triggered reveals, character/icon animations | Brand/startup stories, mission-driven products, premium/lifestyle brands | Technical/complex products (unless narrative-driven), traditional enterprise software | ✓ WCAG AA |
| Data-Dense Dashboard | Hover tooltips, chart zoom on click, row highlighting on hover | Business intelligence dashboards, financial analytics, enterprise reporting | Marketing dashboards, consumer-facing analytics, simple reporting | ✓ WCAG AA |
| Heat Map & Heatmap Style | Color gradient transitions on data change, cell highlighting on hover, tooltip reveal on click | Geographical analysis, performance matrices, correlation analysis | Linear data representation, categorical comparisons (use bar charts), small datasets | ⚠ Colorblind considerations |
| Executive Dashboard | KPI value animations (count-up), trend arrow direction animations, metric card hover lift | C-suite dashboards, business summary reports, decision-maker dashboards | Detailed analyst dashboards, technical deep-dives, operational monitoring | ✓ WCAG AA |
| Real-Time Monitoring | Real-time chart animations, alert pulse/glow, status indicator blink animation | System monitoring dashboards, DevOps dashboards, real-time analytics | Historical analysis, long-term trend reports, archived data dashboards | ✓ WCAG AA |
| Drill-Down Analytics | Drill-down expand animations, breadcrumb click transitions, smooth detail reveal | Sales analytics, product analytics, funnel analysis | Simple linear data, single-metric dashboards, streaming real-time dashboards | ✓ WCAG AA |
| Comparative Analysis Dashboard | Comparison bar animations (grow to value), delta indicator animations (direction arrows), highlight on compare | Period-over-period reporting, A/B test dashboards, market comparison | Single metric dashboards, future projections (use forecasting), real-time only (no historical) | ✓ WCAG AA |
| Predictive Analytics | Forecast line animation on draw, confidence band fade-in, anomaly pulse alert | Forecasting dashboards, anomaly detection systems, trend prediction dashboards | Historical-only dashboards, simple reporting, real-time operational dashboards | ✓ WCAG AA |
| User Behavior Analytics | Funnel animation (fill-down), flow diagram animations (connection draw), conversion pulse | Conversion funnel analysis, user journey tracking, engagement analytics | Real-time operational metrics, technical system monitoring, financial transactions | ✓ WCAG AA |
| Financial Dashboard | Number animations (count-up), trend direction indicators, percentage change animations | Financial reporting, accounting dashboards, portfolio tracking | Simple business dashboards, entertainment/social metrics, non-financial data | ✓ WCAG AAA |
| Sales Intelligence Dashboard | Deal movement animations, metric updates, leaderboard ranking changes | CRM dashboards, sales management, opportunity tracking | Marketing analytics, customer support metrics, HR dashboards | ✓ WCAG AA |
| Neubrutalism | box-shadow: 4px 4px 0 #000, border: 3px solid #000, no gradients | Gen Z brands, startups, creative agencies | Luxury brands, finance, healthcare | ✓ WCAG AAA |
| Bento Box Grid | grid-template with varied spans, rounded-xl (16px), subtle shadows | Dashboards, product pages, portfolios | Dense data tables, text-heavy content, real-time monitoring | ✓ WCAG AA |
| Y2K Aesthetic | linear-gradient metallic, glossy buttons, 3D chrome effects | Fashion brands, music platforms, Gen Z brands | B2B enterprise, healthcare, finance | ⚠ Check contrast |
| Cyberpunk UI | Neon glow (text-shadow), glitch animations (skew/offset), scanlines (::before overlay) | Gaming platforms, tech products, crypto apps | Corporate enterprise, healthcare, family apps | ⚠ Limited (dark+neon) |
| Organic Biophilic | Rounded corners (16-24px), organic curves (border-radius variations), natural shadows | Wellness apps, sustainability brands, eco products | Tech-focused products, gaming, industrial | ✓ WCAG AA |
| AI-Native UI | Typing indicators (3-dot pulse), streaming text animations, pulse animations | AI products, chatbots, voice assistants | Traditional forms, data-heavy dashboards, print-first content | ✓ WCAG AA |
| Memphis Design | transform: rotate(), clip-path: polygon(), mix-blend-mode | Creative agencies, music sites, youth brands | Corporate finance, healthcare, legal | ⚠ Check contrast |
| Vaporwave | text-shadow glow, linear-gradient, filter: hue-rotate() | Music platforms, gaming, creative portfolios | Business apps, e-commerce, education | ⚠ Poor (motion) |
| Dimensional Layering | z-index stacking, box-shadow elevation (4 levels), transform: translateZ() | Dashboards, card layouts, modals | Print-style layouts, simple blogs, low-end devices | ⚠ Moderate (SR issues) |
| Exaggerated Minimalism | font-size: clamp(3rem 10vw 12rem), font-weight: 900, letter-spacing: -0.05em | Fashion, architecture, portfolios | E-commerce catalogs, dashboards, forms | ✓ WCAG AA |
| Kinetic Typography | @keyframes text animation, typing effect, background-clip: text | Hero sections, marketing sites, video platforms | Long-form content, accessibility-critical, data interfaces | ❌ Poor (motion) |
| Parallax Storytelling | transform: translateY(scroll), position: fixed/sticky, perspective: 1px | Brand storytelling, product launches, case studies | E-commerce, dashboards, mobile-first | ❌ Poor (motion) |
| Swiss Modernism 2.0 | display: grid, grid-template-columns: repeat(12 1fr), gap: 1rem | Corporate sites, architecture, editorial | Playful brands, children's sites, entertainment | ✓ WCAG AAA |
| HUD / Sci-Fi FUI | Glow effects, scanning animations, ticker text | Sci-fi games, space tech, cybersecurity | Standard corporate, reading heavy content, accessible public services | ⚠ Poor (thin lines) |
| Pixel Art | Frame-by-frame sprite animation, blinking cursor, instant transitions | Indie games, retro tools, creative portfolios | Professional corporate, modern SaaS, high-res photography sites | ✓ Good (if contrast ok) |
| Bento Grids | Hover scale (1.02), soft shadow expansion, smooth layout shifts | Product features, dashboards, personal sites | Long-form reading, data tables, complex forms | ✓ WCAG AA |
| Spatial UI (VisionOS) | Parallax depth, dynamic lighting response, gaze-hover effects | Spatial computing apps, VR/AR interfaces, immersive media | Text-heavy documents, high-contrast requirements, non-3D capable devices | ⚠ Contrast risks |
| E-Ink / Paper | No motion blur, distinct page turns, grain/noise texture | Reading apps, digital newspapers, minimal journals | Gaming, video platforms, high-energy marketing | ✓ WCAG AAA |
| Gen Z Chaos / Maximalism | Marquee scrolls, jitter, sticker layering | Gen Z lifestyle brands, music artists, creative portfolios | Corporate, government, healthcare | ❌ Poor |
| Biomimetic / Organic 2.0 | Breathing animations, fluid morphing, generative growth | Sustainability tech, biotech, advanced health | Standard SaaS, data grids, strict corporate | ✓ Good |

## Typography

Heading and body fonts per pairing (Google Fonts unless noted above).

| Pairing | Heading | Body | Mood | Best for |
|---|---|---|---|---|
| Classic Elegant | Playfair Display | Inter | elegant, luxury, sophisticated, timeless | Luxury brands, fashion, spa |
| Modern Professional | Poppins | Open Sans | modern, professional, clean, corporate | SaaS, corporate sites, business apps |
| Tech Startup | Space Grotesk | DM Sans | tech, startup, modern, innovative | Tech companies, startups, SaaS |
| Editorial Classic | Cormorant Garamond | Libre Baskerville | editorial, classic, literary, traditional | Publishing, blogs, news sites |
| Minimal Swiss | Inter | Inter | minimal, clean, swiss, functional | Dashboards, admin panels, documentation |
| Playful Creative | Fredoka | Nunito | playful, friendly, fun, creative | Children's apps, educational, gaming |
| Bold Statement | Bebas Neue | Source Sans 3 | bold, impactful, strong, dramatic | Marketing sites, portfolios, agencies |
| Wellness Calm | Lora | Raleway | calm, wellness, health, relaxing | Health apps, wellness, spa |
| Developer Mono | JetBrains Mono | IBM Plex Sans | code, developer, technical, precise | Developer tools, documentation, code editors |
| Retro Vintage | Abril Fatface | Merriweather | retro, vintage, nostalgic, dramatic | Vintage brands, breweries, restaurants |
| Geometric Modern | Outfit | Work Sans | geometric, modern, clean, balanced | General purpose, portfolios, agencies |
| Luxury Serif | Cormorant | Montserrat | luxury, high-end, fashion, elegant | Fashion brands, luxury e-commerce, jewelry |
| Friendly SaaS | Plus Jakarta Sans | Plus Jakarta Sans | friendly, modern, saas, clean | SaaS products, web apps, dashboards |
| News Editorial | Newsreader | Roboto | news, editorial, journalism, trustworthy | News sites, blogs, magazines |
| Handwritten Charm | Caveat | Quicksand | handwritten, personal, friendly, casual | Personal blogs, invitations, creative portfolios |
| Corporate Trust | Lexend | Source Sans 3 | corporate, trustworthy, accessible, readable | Enterprise, government, healthcare |
| Brutalist Raw | Space Mono | Space Mono | brutalist, raw, technical, monospace | Brutalist designs, developer portfolios, experimental |
| Fashion Forward | Syne | Manrope | fashion, avant-garde, creative, bold | Fashion brands, creative agencies, art galleries |
| Soft Rounded | Varela Round | Nunito Sans | soft, rounded, friendly, approachable | Children's products, pet apps, friendly brands |
| Premium Sans | Satoshi | General Sans | premium, modern, clean, sophisticated | Premium brands, modern agencies, SaaS |
| Vietnamese Friendly | Be Vietnam Pro | Noto Sans | vietnamese, international, readable, clean | Vietnamese sites, multilingual apps, international products |
| Japanese Elegant | Noto Serif JP | Noto Sans JP | japanese, elegant, traditional, modern | Japanese sites, Japanese restaurants, cultural sites |
| Korean Modern | Noto Sans KR | Noto Sans KR | korean, modern, clean, professional | Korean sites, K-beauty, K-pop |
| Chinese Traditional | Noto Serif TC | Noto Sans TC | chinese, traditional, elegant, cultural | Traditional Chinese sites, cultural content, Taiwan/Hong Kong markets |
| Chinese Simplified | Noto Sans SC | Noto Sans SC | chinese, simplified, modern, professional | Simplified Chinese sites, mainland China market, business apps |
| Arabic Elegant | Noto Naskh Arabic | Noto Sans Arabic | arabic, elegant, traditional, cultural | Arabic sites, Middle East market, Islamic content |
| Thai Modern | Noto Sans Thai | Noto Sans Thai | thai, modern, readable, clean | Thai sites, Southeast Asia, tourism |
| Hebrew Modern | Noto Sans Hebrew | Noto Sans Hebrew | hebrew, modern, RTL, clean | Hebrew sites, Israeli market, Jewish content |
| Legal Professional | EB Garamond | Lato | legal, professional, traditional, trustworthy | Law firms, legal services, contracts |
| Medical Clean | Figtree | Noto Sans | medical, clean, accessible, professional | Healthcare, medical clinics, pharma |
| Financial Trust | IBM Plex Sans | IBM Plex Sans | financial, trustworthy, professional, corporate | Banks, finance, insurance |
| Real Estate Luxury | Cinzel | Josefin Sans | real estate, luxury, elegant, sophisticated | Real estate, luxury properties, architecture |
| Restaurant Menu | Playfair Display SC | Karla | restaurant, menu, culinary, elegant | Restaurants, cafes, food blogs |
| Art Deco | Poiret One | Didact Gothic | art deco, vintage, 1920s, elegant | Vintage events, art deco themes, luxury hotels |
| Magazine Style | Libre Bodoni | Public Sans | magazine, editorial, publishing, refined | Magazines, online publications, editorial content |
| Crypto/Web3 | Orbitron | Exo 2 | crypto, web3, futuristic, tech | Crypto platforms, NFT, blockchain |
| Gaming Bold | Russo One | Chakra Petch | gaming, bold, action, esports | Gaming, esports, action games |
| Indie/Craft | Amatic SC | Cabin | indie, craft, handmade, artisan | Craft brands, indie products, artisan |
| Startup Bold | Clash Display | Satoshi | startup, bold, modern, innovative | Startups, pitch decks, product launches |
| E-commerce Clean | Rubik | Nunito Sans | ecommerce, clean, shopping, product | E-commerce, online stores, product pages |
| Academic/Research | Crimson Pro | Atkinson Hyperlegible | academic, research, scholarly, accessible | Universities, research papers, academic journals |
| Dashboard Data | Fira Code | Fira Sans | dashboard, data, analytics, code | Dashboards, analytics, data visualization |
| Music/Entertainment | Righteous | Poppins | music, entertainment, fun, energetic | Music platforms, entertainment, events |
| Minimalist Portfolio | Archivo | Space Grotesk | minimal, portfolio, designer, creative | Design portfolios, creative professionals, minimalist brands |
| Kids/Education | Baloo 2 | Comic Neue | kids, education, playful, friendly | Children's apps, educational games, kid-friendly content |
| Wedding/Romance | Great Vibes | Cormorant Infant | wedding, romance, elegant, script | Wedding sites, invitations, romantic brands |
| Science/Tech | Exo | Roboto Mono | science, technology, research, data | Science, research, tech documentation |
| Accessibility First | Atkinson Hyperlegible | Atkinson Hyperlegible | accessible, readable, inclusive, WCAG | Accessibility-critical sites, government, healthcare |
| Sports/Fitness | Barlow Condensed | Barlow | sports, fitness, athletic, energetic | Sports, fitness, gyms |
| Luxury Minimalist | Bodoni Moda | Jost | luxury, minimalist, high-end, sophisticated | Luxury minimalist brands, high-end fashion, premium products |
| Tech/HUD Mono | Share Tech Mono | Fira Code | tech, futuristic, hud, sci-fi | Sci-fi interfaces, developer tools, cybersecurity |
| Pixel Retro | Press Start 2P | VT323 | pixel, retro, gaming, 8-bit | Pixel art games, retro websites, creative portfolios |
| Neubrutalist Bold | Lexend Mega | Public Sans | bold, neubrutalist, loud, strong | Neubrutalist designs, Gen Z brands, bold marketing |
| Academic/Archival | EB Garamond | Crimson Text | academic, old-school, university, research | University sites, archives, research papers |
| Spatial Clear | Inter | Inter | spatial, legible, glass, system | Spatial computing, AR/VR, glassmorphism interfaces |
| Kinetic Motion | Syncopate | Space Mono | kinetic, motion, futuristic, speed | Music festivals, automotive, high-energy brands |
| Gen Z Brutal | Anton | Epilogue | brutal, loud, shouty, meme | Gen Z marketing, streetwear, viral campaigns |

## Landing patterns

| Pattern | Section order | Primary CTA | Effects |
|---|---|---|---|
| Hero + Features + CTA | 1. Hero with headline/image, 2. Value prop, 3. Key features (3-5), 4. CTA section, 5. Footer | Hero (sticky) + Bottom | Hero parallax, feature card hover lift, CTA glow on hover |
| Hero + Testimonials + CTA | 1. Hero, 2. Problem statement, 3. Solution overview, 4. Testimonials carousel, 5. CTA | Hero (sticky) + Post-testimonials | Testimonial carousel slide animations, quote marks animations, avatar fade-in |
| Product Demo + Features | 1. Hero, 2. Product video/mockup (center), 3. Feature breakdown per section, 4. Comparison (optional), 5. CTA | Video center + CTA right/bottom | Video play button pulse, feature scroll reveals, demo interaction highlights |
| Minimal Single Column | 1. Hero headline, 2. Short description, 3. Benefit bullets (3 max), 4. CTA, 5. Footer | Center, large CTA button | Minimal hover effects. Smooth scroll. CTA scale on hover (subtle) |
| Funnel (3-Step Conversion) | 1. Hero, 2. Step 1 (problem), 3. Step 2 (solution), 4. Step 3 (action), 5. CTA progression | Each step: mini-CTA. Final: main CTA | Step number animations, progress bar fill, step transitions smooth scroll |
| Comparison Table + CTA | 1. Hero, 2. Problem intro, 3. Comparison table (product vs competitors), 4. Pricing (optional), 5. CTA | Table: Right column. CTA: Below table | Table row hover highlight, price toggle animations, feature checkmark animations |
| Lead Magnet + Form | 1. Hero (benefit headline), 2. Lead magnet preview (ebook cover, checklist, etc), 3. Form (minimal fields), 4. CTA submit | Form CTA: Submit button | Form focus state animations, input validation animations, success confirmation animation |
| Pricing Page + CTA | 1. Hero (pricing headline), 2. Price comparison cards, 3. Feature comparison table, 4. FAQ section, 5. Final CTA | Each card: CTA button. Sticky CTA in nav | Price toggle animation (monthly/yearly), card comparison highlight, FAQ accordion open/close |
| Video-First Hero | 1. Hero with video background, 2. Key features overlay, 3. Benefits section, 4. CTA | Overlay on video (center/bottom) + Bottom section | Video autoplay muted, parallax scroll, text fade-in on scroll |
| Scroll-Triggered Storytelling | 1. Intro hook, 2. Chapter 1 (problem), 3. Chapter 2 (journey), 4. Chapter 3 (solution), 5. Climax CTA | End of each chapter (mini) + Final climax CTA | ScrollTrigger animations, parallax layers, progressive disclosure |
| AI Personalization Landing | 1. Dynamic hero (personalized), 2. Relevant features, 3. Tailored testimonials, 4. Smart CTA | Context-aware placement based on user segment | Dynamic content swap, fade transitions, personalized product recommendations |
| Waitlist/Coming Soon | 1. Hero with countdown, 2. Product teaser/preview, 3. Email capture form, 4. Social proof (waitlist count) | Email form prominent (above fold) + Sticky form on scroll | Countdown timer animation, email validation feedback, success confetti |
| Comparison Table Focus | 1. Hero (problem statement), 2. Comparison matrix (you vs competitors), 3. Feature deep-dive, 4. Winner CTA | After comparison table (highlighted row) + Bottom | Table row hover highlight, feature checkmark animations, sticky comparison header |
| Pricing-Focused Landing | 1. Hero (value proposition), 2. Pricing cards (3 tiers), 3. Feature comparison, 4. FAQ, 5. Final CTA | Each pricing card + Sticky CTA in nav + Bottom | Price toggle monthly/annual animation, card hover lift, FAQ accordion smooth open |
| App Store Style Landing | 1. Hero with device mockup, 2. Screenshots carousel, 3. Features with icons, 4. Reviews/ratings, 5. Download CTAs | Download buttons prominent (App Store + Play Store) throughout | Device mockup rotations, screenshot slider, star rating animations |
| FAQ/Documentation Landing | 1. Hero with search bar, 2. Popular categories, 3. FAQ accordion, 4. Contact/support CTA | Search bar prominent + Contact CTA for unresolved questions | Search autocomplete, smooth accordion open/close, category hover |
| Immersive/Interactive Experience | 1. Full-screen interactive element, 2. Guided product tour, 3. Key benefits revealed, 4. CTA after completion | After interaction complete + Skip option for impatient users | WebGL, 3D interactions, gamification elements |
| Event/Conference Landing | 1. Hero (date/location/countdown), 2. Speakers grid, 3. Agenda/schedule, 4. Sponsors, 5. Register CTA | Register CTA sticky + After speakers + Bottom | Countdown timer, speaker hover cards with bio, agenda tabs |
| Product Review/Ratings Focused | 1. Hero (product + aggregate rating), 2. Rating breakdown, 3. Individual reviews, 4. Buy/CTA | After reviews summary + Buy button alongside reviews | Star fill animations, review filtering, helpful vote interactions |
| Community/Forum Landing | 1. Hero (community value prop), 2. Popular topics/categories, 3. Active members showcase, 4. Join CTA | Join button prominent + After member showcase | Member avatars animation, activity feed live updates, topic hover previews |
| Before-After Transformation | 1. Hero (problem state), 2. Transformation slider/comparison, 3. How it works, 4. Results CTA | After transformation reveal + Bottom | Slider comparison interaction, before/after reveal animations, result counters |
| Marketplace / Directory | 1. Hero (Search focused), 2. Categories, 3. Featured Listings, 4. Trust/Safety, 5. CTA (Become a host/seller) | Hero Search Bar + Navbar 'List your item' | Search autocomplete animation |
| Newsletter / Content First | 1. Hero (Value Prop + Form), 2. Recent Issues/Archives, 3. Social Proof (Subscriber count), 4. About Author | Hero inline form + Sticky header form | Text highlight animations |
| Webinar Registration | 1. Hero (Topic + Timer + Form), 2. What you'll learn, 3. Speaker Bio, 4. Urgency/Bonuses, 5. Form (again) | Hero (Right side form) + Bottom anchor | Countdown timer |
| Enterprise Gateway | 1. Hero (Video/Mission), 2. Solutions by Industry, 3. Solutions by Role, 4. Client Logos, 5. Contact Sales | Contact Sales (Primary) + Login (Secondary) | Slow video background |
| Portfolio Grid | 1. Hero (Name/Role), 2. Project Grid (Masonry), 3. About/Philosophy, 4. Contact | Project Card Hover + Footer Contact | Image lazy load reveal |
| Horizontal Scroll Journey | 1. Intro (Vertical), 2. The Journey (Horizontal Track), 3. Detail Reveal, 4. Vertical Footer | Floating Sticky CTA or End of Horizontal Track | Scroll-jacking (careful), parallax layers, horizontal slide |

_Adapted from the community `ui-ux-pro-max` skill; the catalog tables are condensed from its data files._
