import React from 'react'
import type { AppProps } from 'next/app'

import '../styles/globals.css'
import { ThemeContext, useThemeProvider } from '../hooks/useTheme'

export default function MyApp({ Component, pageProps }: AppProps) {
  const themeValue = useThemeProvider()

  return (
    <ThemeContext.Provider value={themeValue}>
      <Component {...pageProps} />
    </ThemeContext.Provider>
  )
}
