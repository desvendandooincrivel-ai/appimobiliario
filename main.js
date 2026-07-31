
const { app, BrowserWindow, session, ipcMain, dialog } = require('electron');
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
        show: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.restore();
        mainWindow.focus();
    });

    if (app.isPackaged) {
        mainWindow.loadFile(path.join(__dirname, 'build', 'index.html'));
    } else {
        const loadPage = (port) => {
            mainWindow.loadURL(`http://localhost:${port}`).then(() => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.restore();
                    mainWindow.focus();
                }
            }).catch(() => {
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

let currentBotStatus = 'disconnected'; // 'disconnected' | 'starting' | 'connected'
let lastQrCode = null;
let botStarting = false; // Previne múltiplos forks simultâneos

ipcMain.on('bot_start', (event) => {
    if (botProcess || botStarting) {
        // Envia o status e QR Code cacheado imediatamente para sincronizar a tela
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('bot_event', { type: 'STATUS', data: currentBotStatus === 'connected' ? 'CONNECTED' : 'DISCONNECTED' });
            if (lastQrCode && currentBotStatus !== 'connected') {
                mainWindow.webContents.send('bot_event', { type: 'QR_CODE', data: lastQrCode });
            }
        }
        return;
    }

    console.log('Iniciando Processo do Bot...');
    botStarting = true;
    currentBotStatus = 'starting';
    lastQrCode = null;
    const botPath = path.join(__dirname, 'bot', 'botService.js');

    botProcess = fork(botPath, [], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc']
    });
    botStarting = false; // Process is now assigned, safe to clear flag

    // Pular logs do bot para o console principal
    if (botProcess.stdout) {
        botProcess.stdout.on('data', (data) => console.log(`[BOT LOG]: ${data}`));
    }
    if (botProcess.stderr) {
        botProcess.stderr.on('data', (data) => console.error(`[BOT ERR]: ${data}`));
    }

    botProcess.on('message', (msg) => {
        if (msg.type === 'STATUS') {
            currentBotStatus = (msg.data === 'CONNECTED' || msg.data === 'AUTHENTICATED') ? 'connected' : 'disconnected';
            if (currentBotStatus === 'connected') {
                lastQrCode = null;
            }
        }
        if (msg.type === 'QR_CODE') {
            lastQrCode = msg.data;
        }
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
        currentBotStatus = 'disconnected';
        lastQrCode = null;
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
        currentBotStatus = 'disconnected';
        lastQrCode = null;
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

        autoUpdater.on('download-progress', (progressObj) => {
            win.webContents.send('download_progress', progressObj);
        });

        autoUpdater.on('update-downloaded', () => {
            win.webContents.send('update_downloaded');
            win.webContents.send('update_status', 'Pronto para instalar.');
        });

        autoUpdater.on('error', (err) => {
            console.error('Update Store Error:', err);
            win.webContents.send('update_error', err.toString());
        });

        win.webContents.on('did-finish-load', () => {
             // Delay de 5 segundos para o React carregar as UI
            setTimeout(() => {
                autoUpdater.checkForUpdatesAndNotify().catch(() => { });
            }, 5000);
        });

        ipcMain.on('manual_install_update', () => {
            autoUpdater.quitAndInstall();
        });
    }
}

// Versão do App (Global)
ipcMain.handle('get_app_version', () => app.getVersion());

// --- ARMAZENAMENTO LOCAL (BACKUP / OFFLINE) ---
ipcMain.handle('select_folder', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'Selecione a pasta para salvar os arquivos locais'
    });
    return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('save_local_file', async (event, { folderPath, subPath, fileName, fileDataBase64, isJson }) => {
    try {
        const fullDir = path.join(folderPath, subPath);
        if (!fs.existsSync(fullDir)) {
            fs.mkdirSync(fullDir, { recursive: true });
        }
        const fullPath = path.join(fullDir, fileName);
        if (isJson) {
            fs.writeFileSync(fullPath, Buffer.from(fileDataBase64, 'utf-8'));
        } else {
            const base64Data = fileDataBase64.includes(',') ? fileDataBase64.split(',')[1] : fileDataBase64;
            fs.writeFileSync(fullPath, Buffer.from(base64Data, 'base64'));
        }
        return fullPath;
    } catch (e) {
        console.error('Erro ao salvar localmente:', e);
        return null;
    }
});

ipcMain.handle('read_local_json', async (event, { folderPath, fileName }) => {
    try {
        const fullPath = path.join(folderPath, fileName);
        if (fs.existsSync(fullPath)) {
            return fs.readFileSync(fullPath, 'utf-8');
        }
    } catch (e) {
        console.error('Erro ao ler JSON local:', e);
    }
    return null;
});

app.whenReady().then(() => {
    session.defaultSession.clearCache().then(createWindow);
});

app.on('window-all-closed', () => {
    if (botProcess) botProcess.kill();
    if (process.platform !== 'darwin') app.quit();
});
