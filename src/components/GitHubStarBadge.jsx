import React, { useEffect, useState } from "react";

export default function GitHubStarBadge() {
  const [stars, setStars] = useState("200+");

  useEffect(() => {
    let mounted = true;

    fetch("https://nyno.dev/star-counter")
      .then((res) => {
        if (!res.ok) throw new Error("Request failed");
        return res.text();
      })
      .then((data) => {
        if (mounted && data) {
          setStars(data.trim());
        }
      })
      .catch(() => {
        // fallback stays "200+"
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="ghh_wrap">
      <style>{`
        .ghh_wrap,
        .ghh_wrap *{box-sizing:border-box}

        .ghh_wrap{
          position:fixed;
          bottom:16px;
          left:16px;
          z-index:9999;
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
          color:#c9d1d9;
        }

        .ghh_badge{
          display:inline-flex;
          align-items:center;
          gap:10px;
          padding:8px 12px;
          border-radius:10px;
          background:rgba(13,17,23,0.85);
          backdrop-filter: blur(8px);
          border:1px solid rgba(255,255,255,0.06);
          box-shadow:0 6px 18px rgba(2,6,23,0.6);
          text-decoration:none;
          color:inherit;
          transition:transform .12s ease, box-shadow .12s ease;
        }

        .ghh_badge:hover{
          transform:translateY(-2px);
          box-shadow:0 10px 24px rgba(2,6,23,0.75);
        }

        .ghh_star-icon{
          width:14px;
          height:14px;
          flex:0 0 14px;
        }

        .ghh_star-text{
          font-size:13px;
          font-weight:600;
        }

        .ghh_star-count{
          font-size:13px;
          font-weight:600;
          padding:4px 8px;
          border-radius:6px;
          background:rgba(255,255,255,0.06);
        }
      `}</style>

      <a
        className="ghh_badge"
        href="https://github.com/empowerd-cms/nyno"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Star us on GitHub"
      >
        <svg
          className="ghh_star-icon"
          viewBox="0 0 16 16"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d="M8 12.027l-3.717 2.064.711-4.145L1.21 6.91 5.33 6.11 8 2.5l2.67 3.61 4.12.8-3.784 3.035.712 4.146z" />
        </svg>

        <span className="ghh_star-text">Star</span>

        <span className="ghh_star-count" aria-live="polite">
          {stars}
        </span>
      </a>
    </div>
  );
}
