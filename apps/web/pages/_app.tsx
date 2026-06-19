import React from "react";
import type { AppProps } from "next/app";
import Head from "next/head";
import Layout from "../components/Layout";
import { I18nProvider } from "../lib/i18n/context";
import "../styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <I18nProvider>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>AutoATS — AI-Powered Resume Builder</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700;900&family=Outfit:wght@300;400;500;600;700;800&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </I18nProvider>
  );
}
