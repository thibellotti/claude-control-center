import path from 'path'
import { app } from 'electron'
import serve from 'electron-serve'
import { createWindow } from './helpers'
import { registerProjectHandlers } from './ipc/projects'
import { registerLaunchHandlers } from './ipc/launch'
import { registerSettingsHandlers } from './ipc/settings'
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

  const mainWindow = createWindow('main', {
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    backgroundColor: '#0A0A0A',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  // Show window only when ready to prevent white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Start filesystem watcher for live updates
  startProjectWatcher(mainWindow)

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
