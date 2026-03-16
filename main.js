
const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const fs = require('fs');

let botProcess = null;
let mainWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        title: "Jobh Imóveis Manager",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            // webviewTag: true, // Não vamos mais depender do webview para o bot, mas mantemos para features legadas se necessário
            preload: path.join(__dirname, 'preload.js')
        }
    });

    if (app.isPackaged) {
        mainWindow.loadFile(path.join(__dirname, 'build', 'index.html'));
    } else {
        const loadPage = (port) => {
            mainWindow.loadURL(`http://localhost:${port}`).catch(() => {
                if (port < 3005) loadPage(port + 1);
            });
        };
        loadPage(3000);
    }

    // Atalho F12
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.key.toLowerCase() === 'f12') {
            mainWindow.webContents.openDevTools();
            event.preventDefault();
        }
    });

    configureAutoUpdater(mainWindow);
}

// --- GERENCIADOR DO BOT (BACKEND) ---

ipcMain.on('bot_start', () => {
    if (botProcess) return;

    console.log('Iniciando Processo do Bot...');
    const botPath = path.join(__dirname, 'bot', 'botService.js');

    botProcess = fork(botPath, [], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc']
    });

    // Pular logs do bot para o console principal
    if (botProcess.stdout) {
        botProcess.stdout.on('data', (data) => console.log(`[BOT LOG]: ${data}`));
    }
    if (botProcess.stderr) {
        botProcess.stderr.on('data', (data) => console.error(`[BOT ERR]: ${data}`));
    }

    botProcess.on('message', (msg) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('bot_event', msg);
        }
    });

    botProcess.on('error', (err) => {
        console.error('Bot Error:', err);
    });

    botProcess.on('exit', (code) => {
        console.log(`Bot saiu com código ${code}`);
        botProcess = null;
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('bot_event', { type: 'STATUS', data: 'DISCONNECTED' });
        }
    });
});

ipcMain.on('bot_stop', () => {
    if (botProcess) {
        console.log('Parando Bot...');
        botProcess.kill();
        botProcess = null;
    }
});

// Ponte de Dados: React -> Bot (via Arquivo JSON)
ipcMain.on('bot_update_data', (event, data) => {
    if (botProcess) {
        botProcess.send({ type: 'UPDATE_DATA', data });
    } else {
        // Fallback: Salva no disco mesmo sem bot rodando, para quando ele iniciar
        try {
            fs.writeFileSync(path.join(__dirname, 'data_snapshot.json'), JSON.stringify(data));
        } catch (e) {
            console.error('Erro ao salvar snapshot:', e);
        }
    }
});

ipcMain.on('bot_update_config', (event, data) => {
    if (botProcess) {
        botProcess.send({ type: 'UPDATE_CONFIG', data });
    } else {
        try {
            fs.writeFileSync(path.join(__dirname, 'data_config.json'), JSON.stringify(data));
        } catch (e) { }
    }
});


// --- AUTO UPDATER ---
function configureAutoUpdater(win) {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.logger = require("electron-log");
    autoUpdater.logger.transports.file.level = "info";
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = false;

    if (app.isPackaged) {
        autoUpdater.on('update-available', () => {
            win.webContents.send('update_available');
            win.webContents.send('update_status', 'Baixando atualização...');
        });
        autoUpdater.on('update-downloaded', () => {
            win.webContents.send('update_downloaded');
            win.webContents.send('update_status', 'Pronto para instalar.');
        });
        win.webContents.on('did-finish-load', () => {
            autoUpdater.checkForUpdatesAndNotify().catch(() => { });
        });

        // Versão do App (Global)
        ipcMain.handle('get_app_version', () => app.getVersion());

        // --- AUTO UPDATER ---
    }
}

app.whenReady().then(() => {
    session.defaultSession.clearCache().then(createWindow);
});

app.on('window-all-closed', () => {
    if (botProcess) botProcess.kill();
    if (process.platform !== 'darwin') app.quit();
});
