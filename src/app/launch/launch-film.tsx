"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./film.module.css";

type SceneSpec = {
  id: number;
  mountAt: number;
  endAt: number;
  hold?: boolean;
};

const SCENES: SceneSpec[] = [
  { id: 1, mountAt: 0, endAt: 9600 },
  { id: 2, mountAt: 8400, endAt: 17800 },
  { id: 3, mountAt: 16400, endAt: 26800 },
  { id: 4, mountAt: 25400, endAt: 40800 },
  { id: 5, mountAt: 39400, endAt: 52800 },
  { id: 6, mountAt: 51400, endAt: 62800 },
  { id: 7, mountAt: 61400, endAt: 72800 },
  { id: 8, mountAt: 71400, endAt: 83000, hold: true },
];

const LEDGER_ROWS = [
  { title: "RAIL", amount: "$0.12" },
  { title: "ARCADE RUN", amount: "$0.25" },
  { title: "PRESSURE", amount: "$0.02" },
];

/** The coin amount on the checkout card ticks with the live rate, then settles. */
function LiveAmount() {
  const [tick, setTick] = useState(0);
  const values = ["41.57", "41.62", "41.57"];

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setTick(1), 5600),
      window.setTimeout(() => setTick(2), 6600),
      window.setTimeout(() => setTick(0), 7600),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, []);

  return (
    <span key={tick} className={styles.s4Tick}>
      {values[tick]}
    </span>
  );
}

function SceneOne() {
  return (
    <div className={styles.scene}>
      <div className={styles.s1Rule} />
      <div className={styles.s1Dot} />
      <p className={styles.s1Text}>Every payment begins with a question.</p>
    </div>
  );
}

function SceneTwo() {
  return (
    <div className={styles.scene}>
      <div className={styles.s2Rule} />
      <p className={`${styles.s2Word} ${styles.display} ${styles.s2Cycle} ${styles.s2CycleDelay1}`}>
        CUSTODY.
      </p>
      <p className={`${styles.s2Word} ${styles.display} ${styles.s2Cycle} ${styles.s2CycleDelay2}`}>
        WAITING.
      </p>
      <p className={`${styles.s2Word} ${styles.display} ${styles.s2Struck}`}>
        UNCERTAINTY.
        <span className={styles.s2Strike} />
      </p>
    </div>
  );
}

function SceneThree() {
  return (
    <div className={styles.scene}>
      <div className={styles.s3Push}>
        <div className={styles.s3Totem}>
          <p className={`${styles.s3Line} ${styles.s3Line1} ${styles.display}`}>A PRICE.</p>
          <p className={`${styles.s3Line} ${styles.s3Line2} ${styles.display}`}>A LINK.</p>
          <p className={`${styles.s3Line} ${styles.s3Line3} ${styles.display}`}>A WALLET.</p>
        </div>
        <div className={styles.s3Rail} />
        <p className={styles.s3Brand}>RAILSPLIT</p>
      </div>
    </div>
  );
}

function SceneFour() {
  return (
    <div className={styles.scene}>
      <div className={`${styles.s4Grid} grid-fade`} />
      <div className={styles.s4CardWrap}>
        <div className={styles.s4Card}>
          <svg className={styles.s4CardBorder} viewBox="0 0 420 300" preserveAspectRatio="none" aria-hidden="true">
            <rect
              x="0.5"
              y="0.5"
              width="419"
              height="299"
              rx="24"
              pathLength="1"
              fill="none"
              stroke="rgba(255, 255, 255, 0.9)"
              strokeWidth="1"
            />
          </svg>
          <p className={styles.s4Title}>Sample Checkout</p>
          <p className={`${styles.s4Price} ${styles.display}`}>$0.25</p>
          <div className={styles.s4CoinRow}>
            <LiveAmount /> C2FLR
            <span className={styles.s4CoinUnderline} />
          </div>
          <button type="button" tabIndex={-1} className={styles.s4Pay}>
            Pay
          </button>
        </div>
      </div>
    </div>
  );
}

function SceneFive() {
  return (
    <div className={styles.scene}>
      <div className={styles.s5Push}>
        <div className={styles.s5Rail} />
        <div className={styles.s5ConfirmLine} />
        <div className={styles.s5Dot}>
          <span className={styles.s5DotCore} />
        </div>
        <p className={`${styles.s5Label} ${styles.s5LabelRate}`}>Rate read</p>
        <p className={`${styles.s5Label} ${styles.s5LabelWallet}`}>Merchant wallet</p>
        <p className={styles.s5Surplus}>Surplus returned — 0.00</p>
      </div>
    </div>
  );
}

function SceneSix() {
  return (
    <div className={`${styles.scene} ${styles.s6Stage}`}>
      <div className={styles.s6CardWrap}>
        <div className={styles.s6Card}>
          <p className={`${styles.s6Title} ${styles.display}`}>SETTLED</p>
          <div className={styles.s6Rows}>
            {LEDGER_ROWS.map((row, index) => (
              <div key={row.title} className={`${styles.s6Row} ${styles[`s6Row${index + 1}`]}`}>
                <span className={styles.s6RowTitle}>{row.title}</span>
                <span className={styles.s6RowAmount}>{row.amount}</span>
                <span className={`${styles.s6Tag} ${styles[`s6Tag${index + 1}`]}`}>SETTLED</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SceneSeven() {
  return (
    <div className={styles.scene}>
      <div className={styles.s7Stack}>
        <p className={`${styles.s7Word} ${styles.display}`} style={{ animationDelay: "1.6s" }}>
          PRICE.
        </p>
        <p className={`${styles.s7Word} ${styles.display}`} style={{ animationDelay: "2.7s" }}>
          PROMISE.
        </p>
        <p className={`${styles.s7Word} ${styles.display}`} style={{ animationDelay: "3.8s" }}>
          PROOF.
        </p>
      </div>
    </div>
  );
}

function SceneEight({ onReplay }: { onReplay: () => void }) {
  return (
    <div className={styles.scene}>
      <div className={styles.s8Mark}>
        <h1 className={`${styles.s8Wordmark} ${styles.display}`}>
          {"RAILSPLIT".split("").map((letter, index) => (
            <span
              key={`${letter}-${index}`}
              className={styles.s8Letter}
              style={{ animationDelay: `${2.6 + index * 0.04}s` }}
            >
              {letter}
            </span>
          ))}
        </h1>
        <p className={styles.s8Tagline}>One link. Clear payments.</p>
        <div className={styles.s8Rule} />
        <div className={styles.s8Controls}>
          <button type="button" onClick={onReplay} className={styles.s8Button}>
            Replay
          </button>
          <Link href="/" className={styles.s8Button}>
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}

function SceneStage({ spec, now, onReplay }: { spec: SceneSpec; now: number; onReplay: () => void }) {
  if (spec.mountAt > now) return null;

  const fadeOutStart = spec.hold ? Number.POSITIVE_INFINITY : spec.endAt - 700;
  const opacity = now >= fadeOutStart ? 0 : 1;
  const interactive = spec.id === 8 && opacity === 1;

  const scene = {
    1: <SceneOne />,
    2: <SceneTwo />,
    3: <SceneThree />,
    4: <SceneFour />,
    5: <SceneFive />,
    6: <SceneSix />,
    7: <SceneSeven />,
    8: <SceneEight onReplay={onReplay} />,
  }[spec.id];

  return (
    <div className={styles.stage} style={{ opacity, zIndex: spec.id, pointerEvents: interactive ? "auto" : "none" }}>
      {scene}
    </div>
  );
}

export function LaunchFilm() {
  const [run, setRun] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const id = window.setInterval(() => setNow(performance.now() - start), 100);
    return () => window.clearInterval(id);
  }, [run]);

  function replay() {
    setNow(0);
    setRun((previous) => previous + 1);
  }

  return (
    <main key={run} className={styles.filmRoot}>
      {SCENES.map((spec) => (
        <SceneStage key={spec.id} spec={spec} now={now} onReplay={replay} />
      ))}
    </main>
  );
}
