"use client";

import { useEffect, useState, type ReactNode } from "react";

import { Dropdown, IconButton, MenuItem } from "../ui/primitives";

const navigation = [
  { href: "/", label: "Academy" },
  { href: "/catalog", label: "Catalog" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/glossary", label: "Glossary" },
  { href: "/about", label: "About" },
];

function Header() {
  const [navOpen, setNavOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setNavOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);

  return (
    <header className="site-shell__header">
      <div className="site-shell__header-inner">
        <a className="site-shell__logo" href="/">
          <span aria-hidden="true">C_</span>
          <span>Codeology</span>
        </a>
        <button
          className="site-shell__menu-toggle"
          type="button"
          aria-expanded={navOpen}
          aria-controls="site-navigation"
          onClick={() => setNavOpen((value) => !value)}
        >
          <span aria-hidden="true">{navOpen ? "×" : "≡"}</span>
          <span>{navOpen ? "Close" : "Menu"}</span>
        </button>
        <nav id="site-navigation" className="site-shell__nav" aria-label="Primary" data-open={navOpen}>
          {navigation.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
        </nav>
        <div className="site-shell__actions">
          <IconButton label={dark ? "Use light theme" : "Use dark theme"} onClick={() => setDark((value) => !value)}>
            <span aria-hidden="true">{dark ? "L" : "N"}</span>
          </IconButton>
          <Dropdown label="AP">
            <div className="ui-menu__profile">
              <span aria-hidden="true">AP</span>
              <div><strong>Alex Patel</strong><small>Fixture learner</small></div>
            </div>
            <MenuItem>View profile</MenuItem>
            <MenuItem>Learning progress</MenuItem>
            <MenuItem>Sign out preview</MenuItem>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-shell__footer">
      <div>
        <p><strong>Codeology</strong> · Learn freely. Build for real. Prove what you can do.</p>
        <nav aria-label="Footer">
          <a href="/catalog">Catalog</a>
          <a href="/assurance">Evidence policy</a>
          <a href="/credits">Credits</a>
          <a href="/about">About</a>
        </nav>
      </div>
    </footer>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Header />
      {children}
      <Footer />
    </>
  );
}
