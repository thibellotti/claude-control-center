import path from 'path'
import { app } from 'electron'
import serve from 'electron-serve'
import { createWindow } from './helpers'
import { registerProjectHandlers } from './ipc/projects'
import { registerLaunchHandlers } from './ipc/launch'
import { registerSettingsHandlers } from './ipc/settings'
import { registerSessionHandlers } from './ipc/sessions'
import { registerFileHandlers } from './ipc/files'
import { registerPromptHandlers } from './ipc/prompts'
import { registerPreviewHandlers, cleanupPreviewServers } from './ipc/preview'
import { registerWorkspaceHandlers } from './ipc/workspaces'
import { registerSessionReplayHandlers } from './ipc/session-replay'
import { registerComponentHandlers } from './ipc/components'
import { registerScreenshotHandlers } from './ipc/screenshots'
import { registerFigmaHandlers } from './ipc/figma'
import { registerHandoffHandlers } from './ipc/handoff'
import { registerDeployHandlers } from './ipc/deploy'
import { registerUsageHandlers } from './ipc/usage'
import { registerTerminalHandlers, cleanupTerminalSessions } from './ipc/terminal'
import { registerLiveFeedHandlers, cleanupLiveFeed } from './ipc/live-feed'
import { registerSupabaseHandlers } from './ipc/supabase-info'
import { registerGitHubHandlers } from './ipc/github-info'
import { registerRequestHandlers, cleanupRequests } from './ipc/requests'
import { registerPageHandlers } from './ipc/pages'
import { registerTemplateHandlers } from './ipc/templates'
import { registerAccountHandlers } from './ipc/account'
import { startProjectWatcher } from './watchers/project-watcher'

const isProd = process.env.NODE_ENV === 'production'

if (isProd) {
  serve({ directory: 'app' })
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`)
}

;(async () => {
  await app.whenReady()

  // Register all IPC handlers
  registerProjectHandlers()
  registerLaunchHandlers()
  registerSettingsHandlers()
  registerSessionHandlers()
  registerFileHandlers()
  registerPromptHandlers()
  registerPreviewHandlers()
  registerWorkspaceHandlers()
  registerSessionReplayHandlers()
  registerComponentHandlers()
  registerScreenshotHandlers()
  registerFigmaHandlers()
  registerHandoffHandlers()
  registerDeployHandlers()
  registerUsageHandlers()
  registerTerminalHandlers()
  registerLiveFeedHandlers()
  registerSupabaseHandlers()
  registerGitHubHandlers()
  registerRequestHandlers()
  registerPageHandlers()
  registerTemplateHandlers()
  registerAccountHandlers()

  const mainWindow = createWindow('main', {
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    backgroundColor: '#0A0A0A',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  // Start filesystem watcher for live updates
  const watcher = startProjectWatcher(mainWindow)

  // Close watcher before quit to prevent FSEvents native crash
  app.on('before-quit', () => {
    watcher.close()
    cleanupPreviewServers()
    cleanupTerminalSessions()
    cleanupLiveFeed()
    cleanupRequests()
  })

  if (isProd) {
    await mainWindow.loadURL('app://./home')
  } else {
    const port = process.argv[2]
    await mainWindow.loadURL(`http://localhost:${port}/home`)
    mainWindow.webContents.openDevTools()
  }
})()

app.on('window-all-closed', () => {
  app.quit()
})
