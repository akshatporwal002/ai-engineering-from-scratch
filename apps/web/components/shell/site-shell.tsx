"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";

const navigation = [
  { href: "/", label: "Academy" },
  { href: "/catalog", label: "Catalog" },
  { href: "/roadmap", label: "Skill map" },
  { href: "/cv-analysis", label: "CV Analysis" },
  { href: "/glossary", label: "Glossary" },
  { href: "/about", label: "About" },
  { href: "/credits", label: "Credits" },
] as const;

const searchEntries = [
  ...navigation.map((item) => ({ ...item, kind: "Codeology" })),
  { href: "/certifications", label: "Claude certifications", kind: "Certification" },
  { href: "/lessons/01-math-foundations/08-optimization", label: "Optimization", kind: "Phase 01" },
  { href: "/assurance", label: "Assessment and evidence policy", kind: "Codeology" },
] as const;

type Theme = "light" | "dark";

function pathIsCurrent(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function CommandPalette({ open, onClose, restoreFocus }: { open: boolean; onClose: () => void; restoreFocus: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return [];
    return searchEntries.filter((entry) => `${entry.label} ${entry.kind}`.toLocaleLowerCase().includes(normalized)).slice(0, 12);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    document.body.dataset.paletteOpen = "";
    inputRef.current?.focus();
    return () => { delete document.body.dataset.paletteOpen; };
  }, [open]);

  function close() {
    onClose();
    requestAnimationFrame(restoreFocus);
  }

  function choose(index: number) {
    const target = results[index];
    if (!target) return;
    onClose();
    router.push(target.href);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "Tab") {
      if (event.shiftKey && document.activeElement === inputRef.current) {
        event.preventDefault();
        closeRef.current?.focus();
      } else if (!event.shiftKey && document.activeElement === closeRef.current) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
  }

  function onInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && results.length) {
      event.preventDefault();
      setActive((value) => (value + 1) % results.length);
    } else if (event.key === "ArrowUp" && results.length) {
      event.preventDefault();
      setActive((value) => (value - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(active >= 0 ? active : results.length === 1 ? 0 : -1);
    }
  }

  if (!open) return null;
  return (
    <div id="cmdPalette" className="cp-open" role="dialog" aria-modal="true" aria-label="Search lessons and glossary" onKeyDown={onKeyDown}>
      <button className="cp-backdrop" type="button" aria-label="Close search" onClick={close} />
      <div className="cp-panel">
        <div className="cp-search-row">
          <span className="cp-search-icon"><SearchIcon /></span>
          <input
            ref={inputRef}
            className="cp-input"
            type="search"
            placeholder="Search lessons and glossary…"
            autoComplete="off"
            role="combobox"
            aria-label="Search"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-expanded="true"
            aria-controls="cpResults"
            aria-activedescendant={active >= 0 ? `cpOption-${active}` : undefined}
            value={query}
            onChange={(event) => { setQuery(event.target.value); setActive(-1); }}
            onKeyDown={onInputKeyDown}
          />
          <button ref={closeRef} className="cp-kbd-esc" type="button" aria-label="Close search" onClick={close}>Esc</button>
        </div>
        <ul className="cp-results" id="cpResults" role="listbox" aria-label="Search results">
          {!query.trim() && <li className="cp-empty" role="option" aria-disabled="true">Search lessons, certification routes, and Codeology pages</li>}
          {query.trim() && results.length === 0 && <li className="cp-empty" role="option" aria-disabled="true">No results for <em>{query.trim()}</em></li>}
          {results.map((result, index) => (
            <li
              key={result.href}
              id={`cpOption-${index}`}
              className={`cp-item${active === index ? " cp-item--active" : ""}`}
              role="option"
              aria-selected={active === index}
              onMouseMove={() => setActive(index)}
              onClick={() => choose(index)}
            >
              <span className="cp-item-body"><span className="cp-item-chip">{result.kind}</span><span className="cp-item-name">{result.label}</span></span>
              <span className="cp-item-arrow" aria-hidden="true">›</span>
            </li>
          ))}
        </ul>
        <div className="cp-footer" aria-hidden="true">
          <span className="cp-footer-group"><kbd>↑</kbd><kbd>↓</kbd><span className="cp-footer-label">navigate</span></span>
          <span className="cp-footer-group"><kbd>↵</kbd><span className="cp-footer-label">open</span></span>
          <span className="cp-footer-group"><kbd>Esc</kbd><span className="cp-footer-label">close</span></span>
          <span className="cp-footer-shortcut">⌘K</span>
        </div>
      </div>
    </div>
  );
}

function LoginDialog({ open, onClose, trigger }: { open: boolean; onClose: () => void; trigger: HTMLButtonElement | null }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  function close() {
    onClose();
    requestAnimationFrame(() => trigger?.focus());
  }

  if (!open) return null;
  return (
    <div className="codeology-auth-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) close(); }}>
      <section className="codeology-auth-dialog" role="dialog" aria-modal="true" aria-labelledby="codeologyAuthTitle" onKeyDown={(event) => { if (event.key === "Escape") close(); }}>
        <div className="codeology-auth-panel">
          <button ref={closeRef} className="codeology-auth-close" type="button" aria-label="Close login" onClick={close}>×</button>
          <span className="codeology-auth-eyebrow">CODEOLOGY ACCOUNT</span>
          <h2 id="codeologyAuthTitle">Keep your progress.</h2>
          <p>Log in to carry completed lessons and quiz progress across devices.</p>
          <div className="codeology-auth-providers"><button type="button" disabled>Continue with GitHub</button><button type="button" disabled>Continue with Google</button></div>
          <p className="codeology-auth-status" role="status">Account sign-in is being configured. You can keep learning and your progress will remain in this browser.</p>
          <p className="codeology-auth-privacy">Your account stores learning progress and any account features you choose to use, including saved CV analyses. Course content remains freely available without logging in.</p>
        </div>
      </section>
    </div>
  );
}

function Header() {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const loginButtonRef = useRef<HTMLButtonElement>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [searchOpen, setSearchOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    setTheme(document.documentElement.dataset.theme === "dark" || stored === "dark" ? "dark" : "light");
    const media = window.matchMedia("(max-width: 1100px)");
    const sync = () => { setCompact(media.matches); setNavOpen(false); };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    function onDocumentKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      } else if (event.key === "Escape" && navOpen) {
        setNavOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    function onPointerDown(event: PointerEvent) {
      if (navOpen && !headerRef.current?.contains(event.target as Node)) setNavOpen(false);
    }
    document.addEventListener("keydown", onDocumentKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onDocumentKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [navOpen]);

  function toggleTheme() {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
  }

  const headerActions = (mobile = false) => (
      <div className={mobile ? "header-mobile-tools" : "header-actions"} role="group" aria-label={mobile ? "Site tools" : "Site actions"}>
        <button ref={searchButtonRef} className="search-toggle" type="button" aria-label="Search (⌘K)" title="Search (⌘K)" onClick={() => setSearchOpen(true)}><SearchIcon /></button>
        <button className="theme-toggle" aria-label="Toggle theme" type="button" onClick={toggleTheme}><span className="theme-icon">{theme === "light" ? "N" : "D"}</span></button>
        <button ref={loginButtonRef} className="codeology-login-button" type="button" aria-label="Log in to Codeology" onClick={() => setLoginOpen(true)}>Log in</button>
      </div>
  );

  return (
    <>
      <header ref={headerRef} className={`site-header${navOpen ? " header-nav-open" : ""}`}>
        <div className="header-inner">
          <Link className="logo" href="/" aria-label="Codeology home"><span className="logo-icon" aria-hidden="true" /><span className="codeology-wordmark">CODEOLOGY</span></Link>
          {compact && <button ref={menuButtonRef} className="header-menu-toggle" type="button" aria-controls="siteNavigation" aria-expanded={navOpen} aria-label={navOpen ? "Close navigation" : "Open navigation"} onClick={() => setNavOpen((value) => !value)} onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); setNavOpen(true); requestAnimationFrame(() => headerRef.current?.querySelector<HTMLAnchorElement>(".header-nav a")?.focus()); } }}><span className="header-menu-icon" aria-hidden="true"><span /><span /><span /></span></button>}
          <nav id="siteNavigation" className="header-nav" aria-label="Primary" hidden={compact && !navOpen}>
            {navigation.map((item) => <Link key={item.href} href={item.href} aria-current={pathIsCurrent(pathname, item.href) ? "page" : undefined} onClick={() => setNavOpen(false)}>{item.label}</Link>)}
            {compact && headerActions(true)}
          </nav>
          {!compact && headerActions()}
        </div>
      </header>
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} restoreFocus={() => searchButtonRef.current?.focus()} />
      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} trigger={loginButtonRef.current} />
    </>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell-container footer-inner">
        <p>Codeology · Learn freely. Build for real. Prove what you can do.</p>
        <div className="footer-links">
          <a href="https://github.com/akshatporwal002/ai-engineering-from-scratch" target="_blank" rel="noopener">GitHub</a>
          <Link href="/about">About</Link><Link href="/certifications">Certifications</Link><Link href="/catalog">Catalog</Link><Link href="/glossary">Glossary</Link>
          <a href="https://github.com/akshatporwal002/ai-engineering-from-scratch/issues/new/choose" target="_blank" rel="noopener">Report</a>
          <Link href="/credits">Credits</Link>
        </div>
      </div>
    </footer>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return <><a className="skip-link" href="#main-content">Skip to content</a><Header />{children}<Footer /></>;
}
