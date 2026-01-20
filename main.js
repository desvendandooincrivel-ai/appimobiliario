
const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        title: "Jobh Imóveis Manager",
        webPreferences: {
            nodeIntegration: true, // Habilitado para facilitar a ponte de leitura
            contextIsolation: false, // Necessário para a injeção de script de leitura direta
            webviewTag: true,
            preload: path.join(__dirname, 'preload.js'),
            partition: 'persist:whatsapp_session'
        }
    });

    if (app.isPackaged) {
        win.loadFile(path.join(__dirname, 'build', 'index.html'));
    } else {
        const loadPage = (port) => {
            win.loadURL(`http://localhost:${port}`).catch(() => {
                if (port < 3005) loadPage(port + 1);
            });
        };
        loadPage(3000);
    }

    // INICIATIVA: Abrir DevTools com F12 para debug do usuário
    win.webContents.on('before-input-event', (event, input) => {
        if (input.key.toLowerCase() === 'f12') {
            win.webContents.openDevTools();
            event.preventDefault();
        }
    });

    // APLICAR BYPASS EM TODAS AS SESSÕES (Inclusive WebViews)
    const filter = { urls: ['https://web.whatsapp.com/*'] };

    session.defaultSession.webRequest.onHeadersReceived(filter, (details, callback) => {
        const headers = details.responseHeaders;
        const removeHeader = (name) => {
            delete headers[name];
            delete headers[name.toLowerCase()];
        };

        removeHeader('x-frame-options');
        removeHeader('content-security-policy');
        removeHeader('content-security-policy-report-only');

        callback({
            responseHeaders: {
                ...headers,
                'Access-Control-Allow-Origin': ['*']
            }
        });
    });

    // User Agent Moderno e Realista
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
    session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
        details.requestHeaders['User-Agent'] = ua;
        callback({ cancel: false, requestHeaders: details.requestHeaders });
    });

    // INICIATIVA: Desativar flag de "Robot" que o WhatsApp detecta
    app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');

    // AUTO UPDATER
    const { autoUpdater } = require('electron-updater');

    // Configura logs
    autoUpdater.logger = require("electron-log");
    autoUpdater.logger.transports.file.level = "info";

    // DESABILITA o download automático para podermos controlar a UX (opcional, mas aqui vamos deixar auto)
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    if (app.isPackaged) {
        // Enviar eventos para a UI
        autoUpdater.on('checking-for-update', () => {
            win.webContents.send('update_status', 'Verificando atualizações...');
        });

        autoUpdater.on('update-available', (info) => {
            win.webContents.send('update_available');
            win.webContents.send('update_status', 'Atualização disponível. Baixando...');
        });

        autoUpdater.on('update-not-available', (info) => {
            win.webContents.send('update_status', 'Sistema atualizado.');
        });

        autoUpdater.on('error', (err) => {
            win.webContents.send('update_error', err.toString());
        });

        autoUpdater.on('download-progress', (progressObj) => {
            win.webContents.send('download_progress', progressObj);
        });

        autoUpdater.on('update-downloaded', (info) => {
            win.webContents.send('update_downloaded');
            win.webContents.send('update_status', 'Pronto para instalar.');
        });

        // Não instalar sozinho ao fechar, esperar o usuário mandar
        autoUpdater.autoInstallOnAppQuit = false;

        // Tenta checar imediatamente após carregar a página
        win.webContents.on('did-finish-load', () => {
            win.webContents.send('update_status', 'Iniciando verificação...');
            autoUpdater.checkForUpdatesAndNotify().catch(err => {
                console.log('Erro ao checkar updates:', err);
                win.webContents.send('update_error', err.toString());
            });
        });

        // Handler para instalar agora
        ipcMain.on('manual_install_update', () => {
            autoUpdater.quitAndInstall();
        });

        // Listener para verificação manual vinda do Front (se quisermos um botão "Verificar Agora")
        ipcMain.on('manual_check_update', () => {
            autoUpdater.checkForUpdates();
        });

        // Handler para versão
        ipcMain.handle('get_app_version', () => {
            return app.getVersion();
        });
    }
}

app.whenReady().then(() => {
    // Limpa tudo antes de começar para não ter erro de cache
    session.defaultSession.clearCache().then(createWindow);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
