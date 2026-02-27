import React from 'react'
import type { AppProps } from 'next/app'

import '../styles/globals.css'
import { ThemeContext, useThemeProvider } from '../hooks/useTheme'
import { ToastContext, useToastProvider } from '../hooks/useToast'
import ToastContainer from '../components/shared/Toast'

export default function MyApp({ Component, pageProps }: AppProps) {
  const themeValue = useThemeProvider()
  const toastValue = useToastProvider()

  return (
    <ThemeContext.Provider value={themeValue}>
      <ToastContext.Provider value={toastValue}>
        <Component {...pageProps} />
        <ToastContainer />
      </ToastContext.Provider>
    </ThemeContext.Provider>
  )
}
