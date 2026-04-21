// O CLIENT_ID gerado no Google Cloud Console (Tipo: Aplicativo Web)
const GOOGLE_CLIENT_ID = '703795687000-jt0ppd1ng77ct9lr4b5qrp8q7k4b7kho.apps.googleusercontent.com';
const DRIVE_FOLDER_NAME = 'Jobh Imóveis Manager';
const DRIVE_FILE_NAME = 'jobh_manager_state.json';
const FOLDER_INQUILINOS = 'Inquilinos';
const FOLDER_PROPRIETARIOS = 'Proprietários';

export interface SyncData {
    owners: any[];
    rentals: any[];
    occurrences: any[];
    pixConfig: any;
    contractEvents?: any[];
    lastUpdated: string;
}

export interface GoogleUser {
    name: string;
    email: string;
    picture: string;
}

export interface UploadedReceipt {
    fileId: string;
    fileUrl: string;
    fileName: string;
    webViewLink: string;
}

export const driveSyncService = {
    // 1. Inicia o login OAuth2 usando a biblioteca oficial do Google
    authenticate(): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!(window as any).google) {
                reject('API do Google não carregada. Verifique sua conexão.');
                return;
            }
            const client = (window as any).google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: [
                    'https://www.googleapis.com/auth/drive.file',
                    'https://www.googleapis.com/auth/userinfo.profile',
                    'https://www.googleapis.com/auth/userinfo.email',
                ].join(' '),
                callback: (response: any) => {
                    if (response.error) {
                        reject(response.error);
                    } else {
                        resolve(response.access_token);
                    }
                },
            });
            client.requestAccessToken();
        });
    },

    // 2. Busca informações do usuário logado
    async getUserInfo(accessToken: string): Promise<GoogleUser | null> {
        try {
            const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const data = await res.json();
            return { name: data.name, email: data.email, picture: data.picture };
        } catch (e) {
            console.error('Erro ao buscar usuário:', e);
            return null;
        }
    },

    // 3. Busca ou cria a pasta dedicada no Drive
    async getOrCreateFolder(accessToken: string): Promise<string | null> {
        try {
            // Busca pasta existente
            const q = encodeURIComponent(`name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
            const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const searchData = await searchRes.json();
            if (searchData.files && searchData.files.length > 0) {
                return searchData.files[0].id;
            }
            // Cria pasta nova
            const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: DRIVE_FOLDER_NAME,
                    mimeType: 'application/vnd.google-apps.folder',
                }),
            });
            const folder = await createRes.json();
            return folder.id || null;
        } catch (e) {
            console.error('Erro ao buscar/criar pasta:', e);
            return null;
        }
    },

    // 4. Busca o arquivo de estado no Google Drive (dentro da pasta)
    async getRemoteState(accessToken: string): Promise<SyncData | null> {
        try {
            const folderId = await this.getOrCreateFolder(accessToken);
            const folderFilter = folderId ? ` and '${folderId}' in parents` : '';
            const q = encodeURIComponent(`name='${DRIVE_FILE_NAME}' and trashed=false${folderFilter}`);
            const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const searchData = await searchRes.json();
            if (searchData.files && searchData.files.length > 0) {
                const fileId = searchData.files[0].id;
                const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                return await fileRes.json();
            }
            return null;
        } catch (error) {
            console.error('Erro ao baixar dados do Drive:', error);
            return null;
        }
    },

    // 5. Salva/Atualiza o estado no Google Drive (dentro da pasta)
    async saveState(accessToken: string, data: SyncData): Promise<boolean> {
        try {
            const folderId = await this.getOrCreateFolder(accessToken);
            const folderFilter = folderId ? ` and '${folderId}' in parents` : '';
            const q = encodeURIComponent(`name='${DRIVE_FILE_NAME}' and trashed=false${folderFilter}`);
            const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const searchData = await searchRes.json();
            const fileExists = searchData.files && searchData.files.length > 0;

            const payload = { ...data, lastUpdated: new Date().toISOString() };
            const fileBlob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });

            if (fileExists) {
                const fileId = searchData.files[0].id;
                const form = new FormData();
                form.append('metadata', new Blob([JSON.stringify({ name: DRIVE_FILE_NAME })], { type: 'application/json' }));
                form.append('file', fileBlob);
                const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                    body: form,
                });
                return response.ok;
            } else {
                const metadata: any = { name: DRIVE_FILE_NAME, mimeType: 'application/json' };
                if (folderId) metadata.parents = [folderId];
                const form = new FormData();
                form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
                form.append('file', fileBlob);
                const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                    body: form,
                });
                return response.ok;
            }
        } catch (error) {
            console.error('Erro ao salvar no Drive:', error);
            return false;
        }
    },

    // 6. Cria subpasta dentro de um pai (genérico)
    async getOrCreateSubFolder(accessToken: string, parentId: string, name: string): Promise<string | null> {
        try {
            const q = encodeURIComponent(`name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`);
            const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const data = await res.json();
            if (data.files && data.files.length > 0) return data.files[0].id;

            const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] }),
            });
            const folder = await createRes.json();
            return folder.id || null;
        } catch (e) {
            console.error('Erro ao criar subpasta:', e);
            return null;
        }
    },

    // 7. Pasta raiz do inquilino: Inquilinos / LF001 - João da Silva
    async getInquilinoRootFolder(accessToken: string, refNumber: string, tenantName: string): Promise<string | null> {
        const rootId = await this.getOrCreateFolder(accessToken);
        if (!rootId) return null;
        const inquilinosId = await this.getOrCreateSubFolder(accessToken, rootId, FOLDER_INQUILINOS);
        if (!inquilinosId) return null;
        const folderName = `LF${refNumber} - ${tenantName}`;
        return await this.getOrCreateSubFolder(accessToken, inquilinosId, folderName);
    },

    // 7a. Comprovantes de Pagamento / [Ano]  (sem subpasta de mês — apenas 1 comprovante/mês por inquilino)
    async getInquilinoComprovantePagamentoFolder(accessToken: string, refNumber: string, tenantName: string, year: number): Promise<string | null> {
        const rootId = await this.getInquilinoRootFolder(accessToken, refNumber, tenantName);
        if (!rootId) return null;
        const pagId = await this.getOrCreateSubFolder(accessToken, rootId, 'Comprovantes de Pagamento');
        if (!pagId) return null;
        return await this.getOrCreateSubFolder(accessToken, pagId, String(year));
    },

    // 7b. Documentos do Contrato
    async getInquilinoDocumentosContratoFolder(accessToken: string, refNumber: string, tenantName: string): Promise<string | null> {
        const rootId = await this.getInquilinoRootFolder(accessToken, refNumber, tenantName);
        if (!rootId) return null;
        return await this.getOrCreateSubFolder(accessToken, rootId, 'Documentos do Contrato');
    },

    // 7c. Ocorrências
    async getInquilinoOcorrenciasFolder(accessToken: string, refNumber: string, tenantName: string): Promise<string | null> {
        const rootId = await this.getInquilinoRootFolder(accessToken, refNumber, tenantName);
        if (!rootId) return null;
        return await this.getOrCreateSubFolder(accessToken, rootId, 'Ocorrências');
    },

    // backward compat (used by old payment flow - will be redirected below)
    async getInquilinoFolder(accessToken: string, tenantName: string): Promise<string | null> {
        const rootId = await this.getOrCreateFolder(accessToken);
        if (!rootId) return null;
        const inquilinosId = await this.getOrCreateSubFolder(accessToken, rootId, FOLDER_INQUILINOS);
        if (!inquilinosId) return null;
        return await this.getOrCreateSubFolder(accessToken, inquilinosId, tenantName);
    },

    // 8. Retorna o ID da pasta de um proprietário (criando toda a hierarquia se necessário)
    // Estrutura: Jobh Imóveis Manager / Proprietários / [Nome Proprietário]
    async getProprietarioFolder(accessToken: string, ownerName: string): Promise<string | null> {
        const rootId = await this.getOrCreateFolder(accessToken);
        if (!rootId) return null;
        const proprietariosId = await this.getOrCreateSubFolder(accessToken, rootId, FOLDER_PROPRIETARIOS);
        if (!proprietariosId) return null;
        return await this.getOrCreateSubFolder(accessToken, proprietariosId, ownerName);
    },

    // 8b. Retorna a pasta "Comprovantes de Repasse" dentro da pasta do proprietário
    // Estrutura: Jobh Imóveis Manager / Proprietários / [Nome] / Comprovantes de Repasse / [Ano] / [Mês]
    async getProprietarioRepasseMonthFolder(accessToken: string, ownerName: string, year: number, month: string): Promise<string | null> {
        const ownerFolderId = await this.getProprietarioFolder(accessToken, ownerName);
        if (!ownerFolderId) return null;
        const repasseId = await this.getOrCreateSubFolder(accessToken, ownerFolderId, 'Comprovantes de Repasse');
        if (!repasseId) return null;
        const yearId = await this.getOrCreateSubFolder(accessToken, repasseId, String(year));
        if (!yearId) return null;
        return await this.getOrCreateSubFolder(accessToken, yearId, month);
    },

    // kept for backward compat
    async getProprietarioRepasseFolder(accessToken: string, ownerName: string): Promise<string | null> {
        const ownerFolderId = await this.getProprietarioFolder(accessToken, ownerName);
        if (!ownerFolderId) return null;
        return await this.getOrCreateSubFolder(accessToken, ownerFolderId, 'Comprovantes de Repasse');
    },

    // 9. Faz upload de um comprovante (File ou base64) para uma pasta do Drive
    async uploadReceipt(accessToken: string, folderId: string, file: File, fileName: string): Promise<UploadedReceipt | null> {
        try {
            const metadata = { name: fileName, parents: [folderId] };
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', file);

            const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}` },
                body: form,
            });

            if (!uploadRes.ok) {
                console.error('Upload failed:', await uploadRes.text());
                return null;
            }

            const uploaded = await uploadRes.json();

            // Make the file readable by anyone with the link (optional - comment out if want private)
            await fetch(`https://www.googleapis.com/drive/v3/files/${uploaded.id}/permissions`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'reader', type: 'anyone' }),
            });

            return {
                fileId: uploaded.id,
                fileUrl: uploaded.webContentLink || `https://drive.google.com/file/d/${uploaded.id}/view`,
                fileName: uploaded.name,
                webViewLink: uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`,
            };
        } catch (e) {
            console.error('Erro no upload:', e);
            return null;
        }
    },
};

