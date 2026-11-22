import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

const products = [
  {
    name: 'fleet-bridge',
    tag: 'MCP · STDIO',
    desc: 'One tool surface across OpenClaw gateway agents and Hermes agents. Any MCP client — Zed, Claude Code — sees a single roster and pulls any agent by name.',
    to: '/fleet-bridge',
    license: 'MIT',
    meta: ['6 tools', '2 runtimes', '60s default invoke'],
  },
  {
    name: 'wranglebot',
    tag: 'GUARD · CLI',
    desc: 'Sits between your coding agent and its tools. Dangerous constructs gated before they execute, runaway loops killed by deterministic signals, every decision in a .curt record.',
    to: '/wranglebot',
    license: 'BUSL-1.1',
    meta: ['3 guardrails', 'exit 0/1/2', 'deterministic kills'],
  },
  {
    name: 'tractum',
    tag: 'CONSENSUS · PY',
    desc: 'Three agents debate, each signs its own stance, and the result ships as a k-of-n signed receipt anyone can verify — forever.',
    to: '/tractum',
    license: 'BUSL-1.1',
    meta: ['Ed25519 + BIP-340', 'NIP-78 on Nostr', 'v1/v2 payloads'],
  },
  {
    name: 'cabinet-lite',
    tag: 'SIGNAL-BOX · UI',
    desc: 'The cross-runtime fleet dashboard. Read-only v1: what needs you, who is free, what happened — plates bolted into the frame, invoke GO-gated off.',
    to: '/cabinet-lite',
    license: 'MIT',
    meta: ['SSE live feed', 'plate contract', 'read-only v1'],
  },
];

const tickerItems = [
  'DOCS BUILT FROM SOURCE',
  'EVERY PAGE CITES ITS FILES',
  'fleet-bridge v0.1.1 — MIT',
  'wranglebot v0.1.1 — BUSL-1.1',
  'tractum v0.5.0 — BUSL-1.1',
  'cabinet-lite — the signal box, read-only v1',
  'PULL = INVOKE AN AGENT',
  'INTERLOCK CLEAR',
];

const stats = [
  { label: 'PAGES', value: '41' },
  { label: 'PRODUCTS', value: '4' },
  { label: 'MCP TOOLS', value: '6' },
  { label: 'GUARDRAILS', value: '5' },
  { label: 'RECEIPTS', value: 'K-OF-N' },
];

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title="Leverframe" description={siteConfig.tagline}>
      <main className={styles.frame}>
        {/* TICKER */}
        <div className={styles.ticker} aria-hidden="true">
          <div className={styles.tickerTrack}>
            {[0, 1].map((dup) => (
              <span className={styles.tickerGroup} key={dup}>
                {tickerItems.map((t, i) => (
                  <span className={styles.tickerItem} key={i}>
                    {t} <span className={styles.tickerSep}>◆</span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>

        {/* HERO PLATE */}
        <section className={styles.plate}>
          <p className={styles.plateLabel}>PLATE 01 / SIGNAL-BOX</p>
          <div className={styles.heroInner}>
            <h1 className={styles.wordmark}>
              LEVER<span className={styles.wordmarkAccent}>FRAME</span>
            </h1>
            <p className={styles.tagline}>
              Agent infrastructure — bridge, guardrails, verifiable consensus.
              In daily production use on a multi-agent fleet.
            </p>
            <div className={styles.heroCtas}>
              <Link className="button button--primary button--sm" to="/fleet-bridge">
                START WITH FLEET-BRIDGE
              </Link>
              <a
                className="button button--secondary button--sm"
                href="https://github.com/leverframe"
              >
                GITHUB ORG ↗
              </a>
            </div>
          </div>
          <figure className={styles.gifPlate}>
            <img
              src="/img/leverframe-header.gif"
              alt="The Leverframe lever throw — pull = invoke an agent"
              width={1280}
              height={320}
              loading="eager"
            />
            <figcaption className={styles.gifCaption}>
              pull = invoke an agent · 2.2s loop · the throw escapes over the frame
            </figcaption>
          </figure>
        </section>

        {/* STATS STRIP */}
        <section className={styles.statsRow}>
          {stats.map((s) => (
            <div className={styles.statCell} key={s.label}>
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </section>

        {/* PRODUCT PLATES */}
        <section>
          <div className={styles.sectionHead}>
            <span className={styles.sectionRule} />
            <h2 className={styles.sectionTitle}>PLATE 02 · FRAME / PRODUCTS</h2>
            <span className={styles.sectionRule} />
          </div>
          <div className={styles.tileGrid}>
            {products.map((p, i) => (
              <Link
                key={p.name}
                to={p.to}
                className={styles.tile}
                style={{ animationDelay: `${0.12 * i}s` }}
              >
                <div className={styles.tileTop}>
                  <span className={styles.tileName}>{p.name}</span>
                  <span className={styles.tileTag}>{p.tag}</span>
                </div>
                <p className={styles.tileDesc}>{p.desc}</p>
                <ul className={styles.tileMeta}>
                  {p.meta.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
                <div className={styles.slotRow}>
                  <span className={styles.slot}>
                    <span className={styles.slotBall} />
                  </span>
                  <span className={styles.tileLicense}>{p.license}</span>
                </div>
                <div className={styles.tileCta}>
                  OPEN DOCS <span className={styles.ctaArrow}>→</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* PIPELINE PLATE */}
        <section>
          <div className={styles.sectionHead}>
            <span className={styles.sectionRule} />
            <h2 className={styles.sectionTitle}>PLATE 03 · HOW IT FITS</h2>
            <span className={styles.sectionRule} />
          </div>
          <div className={styles.pipelinePlate}>
            <pre className={styles.pipelineDiagram}>{`  YOUR AGENT (Claude Code / Codex / Zed / any MCP client)
        │
        │  every action passes the gate first
        ▼
  ┌─ wranglebot ──────────────────────────────────┐
  │  ast-gate → loop-breaker → scope-guard        │──▶ deny / warn / .curt record
  └───────────────────────────────────────────────┘
        │ allowed
        ▼
  ┌─ fleet-bridge ────────────────────────────────┐
  │  one roster, two runtimes:                    │
  │    OpenClaw agents  (HTTP chat/completions)   │──▶ invoke by name, sessions server-side
  │    Hermes agents    (ssh -z)                  │
  └───────────────────────────────────────────────┘
        │ agents disagree?
        ▼
  ┌─ tractum ─────────────────────────────────────┐
  │  debate → each stance signed → k-of-n receipt │──▶ verify forever, publish NIP-78
  └───────────────────────────────────────────────┘`}</pre>
          </div>
        </section>

        {/* INDEX PLATE */}
        <section>
          <div className={styles.sectionHead}>
            <span className={styles.sectionRule} />
            <h2 className={styles.sectionTitle}>PLATE 04 · QUICK INDEX</h2>
            <span className={styles.sectionRule} />
          </div>
          <div className={styles.indexGrid}>
            <div className={styles.indexCol}>
              <h3 className={styles.indexHead}>fleet-bridge</h3>
              <Link to="/fleet-bridge/getting-started">Getting started</Link>
              <Link to="/fleet-bridge/configuration">Roster config</Link>
              <Link to="/fleet-bridge/tools">Tool reference</Link>
              <Link to="/fleet-bridge/clients/claude-code">MCP client wiring</Link>
              <Link to="/fleet-bridge/troubleshooting">Troubleshooting</Link>
            </div>
            <div className={styles.indexCol}>
              <h3 className={styles.indexHead}>wranglebot</h3>
              <Link to="/wranglebot/getting-started">Getting started</Link>
              <Link to="/wranglebot/guardrails">Guardrails</Link>
              <Link to="/wranglebot/loop-breaking">Loop-breaking</Link>
              <Link to="/wranglebot/curt-emission">.curt emission</Link>
              <Link to="/wranglebot/reference/cli">CLI reference</Link>
            </div>
            <div className={styles.indexCol}>
              <h3 className={styles.indexHead}>tractum</h3>
              <Link to="/tractum/quickstart">Quickstart</Link>
              <Link to="/tractum/concepts/consensus">Consensus</Link>
              <Link to="/tractum/concepts/receipts">Receipts</Link>
              <Link to="/tractum/api">API reference</Link>
              <Link to="/tractum/verification">Verify a receipt</Link>
            </div>
            <div className={styles.indexCol}>
              <h3 className={styles.indexHead}>cabinet-lite</h3>
              <Link to="/cabinet-lite/getting-started">Getting started</Link>
              <Link to="/cabinet-lite/architecture">Architecture</Link>
              <Link to="/cabinet-lite/plates">Plates</Link>
              <Link to="/cabinet-lite/pull-feed">Pull feed</Link>
              <Link to="/cabinet-lite/configuration">Configuration</Link>
            </div>
          </div>
        </section>

        {/* BOTTOM STRIP */}
        <footer className={styles.bottomStrip}>
          <span>docs.leverframe.dev</span>
          <span className={styles.stripSep}>·</span>
          <span>github.com/leverframe</span>
          <span className={styles.stripSep}>·</span>
          <span>every page cites its files</span>
          <span className={styles.stripSep}>·</span>
          <span className={styles.zeroState}>interlock clear.</span>
        </footer>
      </main>
    </Layout>
  );
}
