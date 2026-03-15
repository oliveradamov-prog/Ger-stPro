'use client'

import Link from 'next/link'

export default function UpgradePage() {
  return (
    <div className="page">
      <div className="hero">
        <div className="kicker">GerüstPro</div>
        <h1 className="h1">Deine Testphase ist abgelaufen</h1>
        <p className="lead">
          Deine 30-Tage-Testphase ist beendet. Upgrade auf GerüstPro Pro, um weiterhin
          Projekte, Tagesberichte, Fotos und PDF-Export zu nutzen.
        </p>
      </div>

      <div className="card">
        <div className="planTitle">GerüstPro Pro</div>
        <div className="price">9 € / Monat</div>

        <div className="features">
          <div>✓ Unbegrenzte Projekte</div>
          <div>✓ Unbegrenzte Tagesberichte</div>
          <div>✓ Foto-Upload</div>
          <div>✓ PDF-Export</div>
          <div>✓ Ideal für Baustellen-Dokumentation</div>
        </div>

        <div className="actions">
          <a
            className="btnPrimary"
            href="mailto:oliver.adamov1@gmail.com?subject=Ger%C3%BCstPro%20Pro%20Upgrade"
          >
            Upgrade anfragen
          </a>

          <Link className="btn" href="/projects">
            Zurück
          </Link>
        </div>
      </div>

      <style jsx>{`
        .page {
          max-width: 860px;
          margin: 0 auto;
          padding: 1rem;
          color: var(--text);
        }

        .hero {
          margin-top: 10px;
          margin-bottom: 18px;
        }

        .kicker {
          color: var(--muted);
          font-weight: 950;
          letter-spacing: 0.02em;
          margin-bottom: 6px;
        }

        .h1 {
          font-size: clamp(34px, 6vw, 52px);
          line-height: 1;
          font-weight: 950;
          margin: 0;
          color: var(--text);
        }

        .lead {
          margin: 12px 0 0;
          max-width: 720px;
          color: var(--muted);
          font-size: 18px;
          line-height: 1.5;
          font-weight: 800;
        }

        .card {
          border: 1px solid var(--border);
          background: var(--chip);
          border-radius: 24px;
          padding: 22px;
          box-shadow: var(--shadow);
        }

        .planTitle {
          font-size: 24px;
          font-weight: 950;
          margin-bottom: 8px;
        }

        .price {
          font-size: 32px;
          font-weight: 950;
          margin-bottom: 18px;
        }

        .features {
          display: grid;
          gap: 10px;
          color: var(--text);
          font-weight: 850;
          margin-bottom: 22px;
        }

        .actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .btn,
        .btnPrimary {
          min-height: 46px;
          padding: 11px 16px;
          border-radius: 16px;
          font-weight: 950;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
        }

        .btn {
          border: 1px solid var(--border);
          background: var(--chip);
          color: var(--text);
        }

        .btnPrimary {
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: rgba(255, 255, 255, 0.1);
          color: var(--text);
        }

        .btn:hover,
        .btnPrimary:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        @media (max-width: 720px) {
          .actions {
            flex-direction: column;
          }

          .btn,
          .btnPrimary {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}