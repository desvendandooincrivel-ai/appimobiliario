// O CLIENT_ID gerado no Google Cloud Console (Tipo: Aplicativo Web)
const GOOGLE_CLIENT_ID = '703795687000-jt0ppd1ng77ct9lr4b5qrp8q7k4b7kho.apps.googleusercontent.com';
const DRIVE_FILE_NAME = 'jobh_manager_state.json';

export interface SyncData {
    owners: any[];
    rentals: any[];
    occurrences: any[];
    pixConfig: any;
    lastUpdated: string;
}

export const driveSyncService = {
    // 1. Inicia o login OAuth2 usando a biblioteca oficial do Google
    authenticate(): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!(window as any).google) {
                reject("API do Google não carregada.");
                return;
            }

            const client = (window as any).google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly',
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

    // 2. Busca o arquivo de estado no Google Drive
    async getRemoteState(accessToken: string): Promise<SyncData | null> {
        try {
            // Primeiro busca o ID do arquivo pelo nome
            const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${DRIVE_FILE_NAME}' and trashed=false`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const searchData = await searchRes.json();

            if (searchData.files && searchData.files.length > 0) {
                const fileId = searchData.files[0].id;
                // Baixa o conteúdo do arquivo
                const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                return await fileRes.json();
            }
            return null;
        } catch (error) {
            console.error("Erro ao baixar dados do Drive:", error);
            return null;
        }
    },

    // 3. Salva/Atualiza o estado no Google Drive
    async saveState(accessToken: string, data: SyncData): Promise<boolean> {
        try {
            // Busca se o arquivo já existe
            const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${DRIVE_FILE_NAME}' and trashed=false`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const searchData = await searchRes.json();
            const fileExists = searchData.files && searchData.files.length > 0;

            const metadata = {
                name: DRIVE_FILE_NAME,
                mimeType: 'application/json',
            };

            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', new Blob([JSON.stringify({ ...data, lastUpdated: new Date().toISOString() })], { type: 'application/json' }));

            let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
            let method = 'POST';

            if (fileExists) {
                const fileId = searchData.files[0].id;
                url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
                method = 'PATCH';
            }

            const response = await fetch(url, {
                method,
                headers: { 'Authorization': `Bearer ${accessToken}` },
                body: form
            });

            return response.ok;
        } catch (error) {
            console.error("Erro ao salvar no Drive:", error);
            return false;
        }
    }
};
