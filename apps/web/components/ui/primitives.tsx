"use client";

import {
  cloneElement,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";

type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }
>(function Button({
  children, className = "", variant = "primary", loading = false, disabled, ...props
}, ref) {
  return (
    <button
      ref={ref}
      className={`ui-button ui-button--${variant} ${className}`.trim()}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="ui-spinner" aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
});

export function IconButton({ label, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <Button className="ui-icon-button" variant="quiet" aria-label={label} {...props}>{children}</Button>;
}

type FieldControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

export function Field({
  label, help, error, children, optional = false,
}: {
  label: string;
  help?: string;
  error?: string;
  children: ReactNode;
  optional?: boolean;
}) {
  const generatedId = useId();
  const id = `field-${generatedId.replace(/:/g, "")}`;
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<FieldControlProps>, {
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })
    : children;

  return (
    <div className="ui-field">
      <label htmlFor={id}>{label}{optional && <span> Optional</span>}</label>
      {control}
      {help && <small id={helpId} className="ui-field__help">{help}</small>}
      {error && <small id={errorId} className="ui-field__error" role="alert">{error}</small>}
    </div>
  );
}

export function Select({ children, className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`ui-select ${className}`.trim()} {...props}>{children}</select>;
}

export function Card({ children, className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return <article className={`ui-card ${className}`.trim()} {...props}>{children}</article>;
}

export function EditorialSection({ eyebrow, title, children }: { eyebrow?: string; title: string; children: ReactNode }) {
  return (
    <section className="ui-editorial">
      {eyebrow && <p className="ui-eyebrow">{eyebrow}</p>}
      <h2>{title}</h2>
      {children}
    </section>
  );
}

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function Dialog({
  title = "Fixture dialog", triggerLabel = "Open dialog", children,
}: {
  title?: string;
  triggerLabel?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const hasOpened = useRef(false);

  useEffect(() => {
    if (!open) {
      if (hasOpened.current) triggerRef.current?.focus();
      return;
    }
    hasOpened.current = true;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>(focusableSelector)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const controls = [...dialog.querySelectorAll<HTMLElement>(focusableSelector)];
      if (!controls.length) return;
      const firstControl = controls[0];
      const lastControl = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === firstControl) {
        event.preventDefault();
        lastControl.focus();
      } else if (!event.shiftKey && document.activeElement === lastControl) {
        event.preventDefault();
        firstControl.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <Button ref={triggerRef} onClick={() => setOpen(true)}>{triggerLabel}</Button>
      {open && (
        <div className="ui-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <div ref={dialogRef} className="ui-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <div className="ui-dialog__heading">
              <h2 id={titleId}>{title}</h2>
              <IconButton label="Close dialog" onClick={() => setOpen(false)}>×</IconButton>
            </div>
            {children}
            <div className="ui-dialog__actions">
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => setOpen(false)}>Confirm fixture</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function Dropdown({ label = "Account", children }: { label?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const root = rootRef.current;
    root?.querySelector<HTMLElement>("[role='menuitem']")?.focus();
    function handleDocumentPointer(event: MouseEvent) {
      if (!root?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleDocumentPointer);
    return () => document.removeEventListener("mousedown", handleDocumentPointer);
  }, [open]);

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const items = [...(rootRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']") ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const offset = event.key === "ArrowDown" ? 1 : -1;
      items[(index + offset + items.length) % items.length]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      items[event.key === "Home" ? 0 : items.length - 1]?.focus();
    }
  }

  return (
    <div className="ui-dropdown" ref={rootRef}>
      <Button
        ref={triggerRef}
        variant="secondary"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {label} <span aria-hidden="true">↓</span>
      </Button>
      {open && <div className="ui-menu" role="menu" onKeyDown={handleMenuKeyDown}>{children}</div>}
    </div>
  );
}

export function MenuItem({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" role="menuitem" tabIndex={-1} {...props}>{children}</button>;
}

export type TabDefinition = { id: string; label: string; content: ReactNode };

export function Tabs({ label, tabs }: { label: string; tabs: TabDefinition[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const rootId = useId().replace(/:/g, "");

  function moveFocus(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    setActive(tabs[next].id);
    document.getElementById(`${rootId}-tab-${tabs[next].id}`)?.focus();
  }

  return (
    <div className="ui-tabs">
      <div role="tablist" aria-label={label}>
        {tabs.map((tab, index) => (
          <button
            id={`${rootId}-tab-${tab.id}`}
            key={tab.id}
            role="tab"
            aria-selected={active === tab.id}
            aria-controls={`${rootId}-panel-${tab.id}`}
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => setActive(tab.id)}
            onKeyDown={(event) => moveFocus(event, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          id={`${rootId}-panel-${tab.id}`}
          key={tab.id}
          role="tabpanel"
          aria-labelledby={`${rootId}-tab-${tab.id}`}
          tabIndex={0}
          hidden={active !== tab.id}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" }) {
  return <span className={`ui-badge ui-badge--${tone}`}>{children}</span>;
}

export function Alert({ children, tone = "info", title }: { children: ReactNode; tone?: "info" | "success" | "error"; title: string }) {
  return <div className={`ui-alert ui-alert--${tone}`} role={tone === "error" ? "alert" : "status"}><strong>{title}</strong><span>{children}</span></div>;
}

export function Skeleton({ label = "Loading content" }: { label?: string }) {
  return <div className="ui-skeleton" role="status"><span className="sr-only">{label}</span><i /><i /><i /></div>;
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return <div className="ui-state"><span aria-hidden="true">◇</span><h3>{title}</h3><p>{children}</p></div>;
}

export function ErrorState({ title, children }: { title: string; children: ReactNode }) {
  return <div className="ui-state ui-state--error" role="alert"><span aria-hidden="true">!</span><h3>{title}</h3><p>{children}</p></div>;
}
