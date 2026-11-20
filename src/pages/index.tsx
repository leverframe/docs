import React from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';

const products = [
  {
    name: 'fleet-bridge',
    desc: 'Bridge your OpenClaw gateway agents and Hermes agents to any MCP client.',
    to: '/fleet-bridge',
  },
  {
    name: 'wranglebot',
    desc: 'Deterministic guardrails, loop-breaking, and .curt emission for coding agents.',
    to: '/wranglebot',
  },
  {
    name: 'tractum',
    desc: 'Verifiable multi-agent consensus with cryptographic receipts.',
    to: '/tractum',
  },
];

export default function Home() {
  return (
    <Layout title="Leverframe" description="Agent infrastructure">
      <main className="container margin-vert--xl">
        <h1>Leverframe</h1>
        <p>Agent infrastructure: bridge, guardrails, verifiable consensus.</p>
        <div className="row">
          {products.map((p) => (
            <div key={p.name} className="col col--4 margin-vert--md">
              <div className="card">
                <div className="card__header">
                  <h3>{p.name}</h3>
                </div>
                <div className="card__body">
                  <p>{p.desc}</p>
                </div>
                <div className="card__footer">
                  <Link className="button button--primary button--sm" to={p.to}>
                    Read the docs
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </Layout>
  );
}
