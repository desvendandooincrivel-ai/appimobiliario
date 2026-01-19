
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('isElectron', true);
