import React from 'react'
import type { AppProps } from 'next/app'
import Head from 'next/head'

import '../styles/globals.css'
import { ThemeContext, useThemeProvider } from '../hooks/useTheme'
import { ToastContext, useToastProvider } from '../hooks/useToast'
import ToastContainer from '../components/shared/Toast'
import ErrorBoundary from '../components/shared/ErrorBoundary'

export default function MyApp({ Component, pageProps }: AppProps) {
  const themeValue = useThemeProvider()
  const toastValue = useToastProvider()

  return (
    <ThemeContext.Provider value={themeValue}>
      <ToastContext.Provider value={toastValue}>
        <Head>
          <title>Forma</title>
        </Head>
        <ErrorBoundary>
          <Component {...pageProps} />
          <ToastContainer />
        </ErrorBoundary>
      </ToastContext.Provider>
    </ThemeContext.Provider>
  )
}
