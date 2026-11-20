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
  },
  {
    name: 'wranglebot',
    tag: 'GUARD · CLI',
    desc: 'Sits between your coding agent and its tools. Dangerous constructs gated before they execute, runaway loops killed by deterministic signals, every decision in a .curt record.',
    to: '/wranglebot',
    license: 'BUSL-1.1',
  },
  {
    name: 'tractum',
    tag: 'CONSENSUS · PY',
    desc: 'Three agents debate, each signs its own stance, and the result ships as a k-of-n signed receipt anyone can verify — forever.',
    to: '/tractum',
    license: 'BUSL-1.1',
  },
];

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title="Leverframe" description={siteConfig.tagline}>
      <main className={styles.frame}>
        {/* HERO PLATE */}
        <section className={styles.heroPlate}>
          <div className={styles.heroInner}>
            <p className={styles.boxLabel}>DOC.SIGNAL-BOX / 01</p>
            <h1 className={styles.wordmark}>LEVER<span className={styles.wordmarkAccent}>FRAME</span></h1>
            <p className={styles.tagline}>
              Agent infrastructure — bridge, guardrails, verifiable consensus.
              In daily production use on a multi-agent fleet.
            </p>
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

        {/* PRODUCT PLATES */}
        <section className={styles.levers}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionRule} />
            <h2 className={styles.sectionTitle}>FRAME · PRODUCTS</h2>
            <span className={styles.sectionRule} />
          </div>
          <div className={styles.tileGrid}>
            {products.map((p, i) => (
              <Link key={p.name} to={p.to} className={styles.tile} style={{ animationDelay: `${0.12 * i}s` }}>
                <div className={styles.tileTop}>
                  <span className={styles.tileName}>{p.name}</span>
                  <span className={styles.tileTag}>{p.tag}</span>
                </div>
                <p className={styles.tileDesc}>{p.desc}</p>
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

        {/* BOTTOM STRIP */}
        <footer className={styles.bottomStrip}>
          <span>docs.leverframe.dev</span>
          <span className={styles.stripSep}>·</span>
          <span>github.com/leverframe</span>
          <span className={styles.stripSep}>·</span>
          <span>docs built from source, every page cites its files</span>
        </footer>
      </main>
    </Layout>
  );
}
