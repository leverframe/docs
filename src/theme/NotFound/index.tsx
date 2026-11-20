import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './404.module.css';

export default function NotFound() {
  return (
    <Layout title="Signal lost">
      <main className={styles.frame}>
        <div className={styles.plate}>
          <p className={styles.plateLabel}>FAULT / ROUTE NOT IN INTERLOCK</p>
          <h1 className={styles.code}>404</h1>
          <p className={styles.msg}>signal lost — this route is not in the interlock.</p>
          <div className={styles.slotRow}>
            <span className={styles.slot}>
              <span className={styles.slotBall} />
            </span>
          </div>
          <div className={styles.links}>
            <Link className="button button--primary button--sm" to="/">
              BACK TO THE BOX
            </Link>
            <Link className="button button--secondary button--sm" to="/fleet-bridge">
              FLEET-BRIDGE DOCS
            </Link>
          </div>
        </div>
      </main>
    </Layout>
  );
}
