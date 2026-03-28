'use client'
  
export default function Loading() {
  return (
    <div className="splash">
      <img src="/logo.png" alt="GerüstPro Logo" className="logo" />

      <style jsx>{`
        .splash {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f172a, #1e293b);
          z-index: 9999;
        }

        .logo {
          width: 140px;
          height: auto;
          object-fit: contain;
          animation: fadeIn 0.6s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}