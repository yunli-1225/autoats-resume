import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useI18n } from "../lib/i18n/context";

const NAV_ITEMS = [
  { href: "/", labelKey: "nav.home", icon: "🏠" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();

  const toggleLang = () => setLocale(locale === "zh" ? "en" : "zh");

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-accent-line" />
        <div className="header-content">
          <h1>
            Auto<span className="header-sub">ATS</span>
          </h1>
          <p className="header-tagline">{t("header.tagline")}</p>
        </div>
        <button
          onClick={toggleLang}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 2,
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 8,
            color: "rgba(255,255,255,0.85)",
            fontFamily: "var(--font-accent)",
            fontSize: "0.7rem",
            fontWeight: 600,
            padding: "4px 10px",
            cursor: "pointer",
            transition: "all 0.2s",
            lineHeight: 1.4,
          }}
          title={locale === "zh" ? "Switch to English" : "切换到中文"}
        >
          {t("header.toggleLang")}
        </button>
      </header>

      <main className="page-content">{children}</main>

      <nav className="page-nav">
        {NAV_ITEMS.map((item) => {
          const isActive = router.pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={isActive ? "active" : ""}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
