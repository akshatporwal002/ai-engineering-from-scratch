"use client";

import { useEffect, useState } from "react";

import {
  Alert,
  Badge,
  Button,
  Card,
  Dialog,
  Dropdown,
  EditorialSection,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  MenuItem,
  Select,
  Skeleton,
  Tabs,
} from "../../components/ui/primitives";

const fixtureTabs = [
  { id: "learn", label: "Learn", content: <p>Understand the operation from first principles.</p> },
  { id: "build", label: "Build", content: <p>Implement the operation with raw math.</p> },
  { id: "prove", label: "Prove", content: <p>Ship evidence that can be reviewed.</p> },
];

function Palette({ dark = false }: { dark?: boolean }) {
  return (
    <div className={dark ? "showcase-theme showcase-theme--dark" : "showcase-theme"}>
      <span>Canvas</span><span>Ink</span><span>Accent</span><span>Surface</span>
    </div>
  );
}

export default function ComponentsPage() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  return (
    <main id="main-content" className="showcase" data-hydrated={hydrated}>
      <header className="showcase__intro">
        <p className="ui-eyebrow">Development showcase · fixture data only</p>
        <h1>Codeology components</h1>
        <p>Accessible primitives translated from the legacy pixel-editorial interface. Every control below is interactive; no account or external service is connected.</p>
      </header>

      <section className="showcase__section" aria-labelledby="tokens-title">
        <div className="showcase__heading"><span>01</span><h2 id="tokens-title">Identity & themes</h2></div>
        <div className="showcase__themes"><Palette /><Palette dark /></div>
        <div className="showcase__themes showcase__theme-controls">
          <Card>
            <p className="ui-eyebrow">Light controls</p>
            <Field label="Light fixture"><input defaultValue="Readable on canvas" /></Field>
            <Button>Light action</Button>
          </Card>
          <div className="showcase-theme--dark showcase-dark-fixture">
            <p className="ui-eyebrow">Dark controls</p>
            <Field label="Dark fixture"><input defaultValue="Readable on canvas" /></Field>
            <Button>Dark action</Button>
          </div>
        </div>
      </section>

      <section className="showcase__section" aria-labelledby="actions-title">
        <div className="showcase__heading"><span>02</span><h2 id="actions-title">Actions</h2></div>
        <div className="showcase__grid">
          <Card>
            <p className="ui-eyebrow">Button states</p>
            <div className="showcase__row">
              <Button>Continue</Button>
              <Button variant="secondary">Save draft</Button>
              <Button variant="quiet">Skip</Button>
              <Button variant="danger">Reset</Button>
              <Button disabled>Disabled</Button>
              <Button loading>Loading</Button>
              <Button className="is-focus-demo" variant="secondary">Focus</Button>
              <IconButton label="Search lessons">⌕</IconButton>
            </div>
          </Card>
          <Card>
            <p className="ui-eyebrow">Status markers</p>
            <div className="showcase__row">
              <Badge>Reference</Badge>
              <Badge tone="success">Complete</Badge>
              <Badge tone="warning">Needs review</Badge>
            </div>
          </Card>
        </div>
      </section>

      <section className="showcase__section" aria-labelledby="fields-title">
        <div className="showcase__heading"><span>03</span><h2 id="fields-title">Fields</h2></div>
        <div className="showcase__grid">
          <Card>
            <Field label="Target role" help="Used only for this deterministic preview.">
              <input placeholder="Machine learning engineer" />
            </Field>
            <Field label="Role context" optional>
              <textarea rows={4} defaultValue="I build reliable learning systems." />
            </Field>
            <Field label="Experience level">
              <Select defaultValue="builder">
                <option value="">Choose one</option>
                <option value="learner">Learning</option>
                <option value="builder">Building</option>
                <option value="leading">Leading</option>
              </Select>
            </Field>
          </Card>
          <Card>
            <Field label="Evidence URL" help="Public repository links only." error="Enter a complete URL beginning with https://">
              <input aria-label="Evidence URL" defaultValue="portfolio.example" />
            </Field>
            <Field label="Unavailable field" help="This state is intentionally disabled.">
              <input disabled defaultValue="Locked fixture" />
            </Field>
          </Card>
        </div>
      </section>

      <section className="showcase__section" aria-labelledby="overlays-title">
        <div className="showcase__heading"><span>04</span><h2 id="overlays-title">Overlays & navigation</h2></div>
        <div className="showcase__grid">
          <Card>
            <Dialog title="Confirm local fixture">
              <p>This dialog traps focus, closes with Escape, and restores focus to its trigger.</p>
              <Field label="Fixture note"><input defaultValue="No external state" /></Field>
            </Dialog>
          </Card>
          <Card>
            <Dropdown label="Open menu">
              <MenuItem>View pathway</MenuItem>
              <MenuItem>Save fixture</MenuItem>
              <MenuItem>Close preview</MenuItem>
            </Dropdown>
          </Card>
          <Card className="showcase__wide">
            <Tabs label="Learning modes" tabs={fixtureTabs} />
          </Card>
        </div>
      </section>

      <section className="showcase__section" aria-labelledby="feedback-title">
        <div className="showcase__heading"><span>05</span><h2 id="feedback-title">Feedback & system states</h2></div>
        <div className="showcase__grid">
          <Card>
            <Alert title="Local preview">No personal data leaves this browser.</Alert>
            <Alert title="Fixture saved" tone="success">The in-memory repository accepted the update.</Alert>
            <Alert title="Could not continue" tone="error">The deterministic provider returned a fixture error.</Alert>
          </Card>
          <Card><Skeleton /></Card>
          <EmptyState title="No evidence yet">Complete a lesson to create your first evidence item.</EmptyState>
          <ErrorState title="Fixture unavailable">Retry when the local API process is running.</ErrorState>
        </div>
      </section>

      <EditorialSection eyebrow="06 · Borderless editorial section" title="Build it. Use it. Explain it.">
        <p>Codeology keeps the lesson—not the framework—at the center. The new system preserves that voice with strong type, restrained surfaces, and an orange signal color.</p>
      </EditorialSection>

      <section className="showcase__section" aria-labelledby="narrow-title">
        <div className="showcase__heading"><span>07</span><h2 id="narrow-title">Narrow fixture</h2></div>
        <div className="showcase__narrow">
          <p className="ui-eyebrow">390px container</p>
          <h3>Touch targets remain usable</h3>
          <Field label="Search lessons"><input type="search" placeholder="Attention" /></Field>
          <Button>Explore the catalog</Button>
        </div>
      </section>
    </main>
  );
}
