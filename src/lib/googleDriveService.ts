import { supabase } from '../supabaseClient';
import { getAccessToken, setAccessToken } from './googleAuth';
import { safeStorage } from './safeStorage';

/**
 * Service to handle uploading files to Google Drive using the REST API v3.
 */

let memoryAccessToken: string | null = null;
let tokenExpiresAt: number = 0; // timestamp in ms

/**
 * Dynamic resolution and automatic token refreshing.
 */
export async function getOrRefreshAccessToken(): Promise<string> {
  // 1. Check if we have standard environment variables for server/admin connection
  const envAccessToken = import.meta.env.VITE_GOOGLE_DRIVE_ACCESS_TOKEN;
  const envRefreshToken = import.meta.env.VITE_GOOGLE_DRIVE_REFRESH_TOKEN;
  const clientId = import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_SECRET;

  // If we already have a valid token in memory
  if (memoryAccessToken && Date.now() < tokenExpiresAt) {
    return memoryAccessToken;
  }

  // A. Use client-configured refresh token if available (purely permanent & robust)
  if (envRefreshToken && clientId && clientSecret) {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: envRefreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (response.ok) {
        const resData = await response.json();
        if (resData.access_token) {
          memoryAccessToken = resData.access_token;
          // Expire 2 minutes early for safety
          tokenExpiresAt = Date.now() + (resData.expires_in || 3600) * 1000 - 120000;
          setAccessToken(memoryAccessToken);
          return memoryAccessToken;
        }
      } else {
        console.error('Gagal memperbarui token Google Drive dari Refresh Token:', await response.text());
      }
    } catch (e) {
      console.error('Error refreshing Google Drive token via OAuth endpoint:', e);
    }
  }

  // B. Support static environment Access Token
  if (envAccessToken) {
    memoryAccessToken = envAccessToken;
    tokenExpiresAt = Date.now() + 1800000; // 30 mins
    setAccessToken(memoryAccessToken);
    return memoryAccessToken;
  }

  // C. Fallback: retrieve the shared token from Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('project_documents')
        .select('*')
        .eq('file_name', '__SHARED_GDRIVE_TOKEN__')
        .maybeSingle();

      if (data && data.description) {
        try {
          const configObj = JSON.parse(data.description);
          if (configObj.accessToken) {
            const expiry = Number(configObj.expiresAt || 0);
            if (expiry > Date.now()) {
              memoryAccessToken = configObj.accessToken;
              tokenExpiresAt = expiry - 120000;
              setAccessToken(memoryAccessToken);
              return memoryAccessToken;
            } else if (configObj.refreshToken && clientId && clientSecret) {
              const response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  client_id: clientId,
                  client_secret: clientSecret,
                  refresh_token: configObj.refreshToken,
                  grant_type: 'refresh_token',
                })
              });
              if (response.ok) {
                const resData = await response.json();
                if (resData.access_token) {
                  const newAccess = resData.access_token;
                  const newExpiry = Date.now() + (resData.expires_in || 3600) * 1000;
                  memoryAccessToken = newAccess;
                  tokenExpiresAt = newExpiry - 120000;
                  setAccessToken(memoryAccessToken);

                  const updatedConfigObj = {
                    ...configObj,
                    accessToken: newAccess,
                    expiresAt: newExpiry
                  };
                  await supabase
                    .from('project_documents')
                    .update({ description: JSON.stringify(updatedConfigObj) })
                    .eq('id', data.id);

                  return memoryAccessToken;
                }
              }
            } else {
              // Token has expired and cannot be refreshed automatically (no client credentials / refresh token)
              throw new Error(`Koneksi Google Drive terdaftar (${configObj.email || 'tanpa nama'}) telah kedaluwarsa (expired). Silakan tautkan ulang akun di panel pengaturan.`);
            }
          }
        } catch (e: any) {
          if (e.message && e.message.includes("kedaluwarsa")) {
            throw e;
          }
          memoryAccessToken = data.description;
          setAccessToken(memoryAccessToken);
          return memoryAccessToken;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch shared Google Drive token from Supabase:', err);
    }
  }

  // D. Fallback to safeStorage caching
  const localTok = safeStorage.getItem('dfw_gdrive_access_token');
  if (localTok) {
    memoryAccessToken = localTok;
    setAccessToken(memoryAccessToken);
    return memoryAccessToken;
  }

  // E. Fallback to firebase auth's active token
  const activeTok = getAccessToken();
  if (activeTok) {
    memoryAccessToken = activeTok;
    return memoryAccessToken;
  }

  throw new Error('Google Drive belum terhubung secara permanen. Pengaturan token belum lengkap.');
}

/**
 * Saves or updates the shared Google Drive credentials inside the database to share them universally.
 */
export async function saveSharedTokenToSupabase(accessToken: string, email: string, refreshToken?: string): Promise<boolean> {
  if (!supabase) return false;
  
  const expiresAt = Date.now() + 3600 * 1000; // 1 hr
  const configObj = {
    accessToken,
    email,
    refreshToken: refreshToken || null,
    expiresAt,
    updatedAt: new Date().toISOString()
  };

  try {
    const { data: existing } = await supabase
      .from('project_documents')
      .select('id')
      .eq('file_name', '__SHARED_GDRIVE_TOKEN__')
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('project_documents')
        .update({
          description: JSON.stringify(configObj),
          web_view_link: email,
          created_at: new Date().toISOString()
        })
        .eq('id', existing.id);
      
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('project_documents')
        .insert({
          id: '00000000-0000-0000-0000-000000000099',
          project_name: 'SYSTEM_CONFIG',
          category: 'CONFIG',
          file_name: '__SHARED_GDRIVE_TOKEN__',
          mime_type: 'application/json',
          file_size: 0,
          description: JSON.stringify(configObj),
          web_view_link: email,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
    }
    return true;
  } catch (err) {
    console.error('Gagal menyimpan shared Google Drive token ke Supabase:', err);
    return false;
  }
}

/**
 * Searches for a folder by name and parent folder ID. 
 * If it doesn't exist, it creates it automatically.
 * Incorporates fallback checks to align with Monitoring Sistem V3
 */
async function getOrCreateFolder(
  folderName: string,
  accessToken: string,
  parentId?: string
): Promise<string> {
  let alternateNames = [folderName];
  if (folderName === "DFW Monitoring Sistem V3" || folderName === "Monitoring Sistem V3") {
    alternateNames = ["Monitoring Sistem V3", "DFW Monitoring Sistem V3"];
  }

  for (const name of alternateNames) {
    const queryParts = [
      `name = '${name.replace(/'/g, "\\'")}'`,
      `mimeType = 'application/vnd.google-apps.folder'`,
      `trashed = false`
    ];
    
    if (parentId) {
      queryParts.push(`'${parentId}' in parents`);
    } else {
      queryParts.push(`'root' in parents`);
    }

    const query = queryParts.join(' and ');
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`;
    
    try {
      const searchResponse = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (searchResponse.ok) {
        const searchResult = await searchResponse.json();
        if (searchResult.files && searchResult.files.length > 0) {
          return searchResult.files[0].id;
        }
      }
    } catch (e) {
      console.warn('Search folder query failed:', e);
    }
  }

  // Create primary requested folder if not found
  const createMetadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) {
    createMetadata.parents = [parentId];
  }

  const createResponse = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createMetadata),
  });

  if (!createResponse.ok) {
    const errText = await createResponse.text();
    throw new Error(`Gagal membuat folder Google Drive "${folderName}": ${createResponse.status} - ${errText}`);
  }

  const createResult = await createResponse.json();
  return createResult.id;
}

export async function uploadFileToGoogleDrive(
  file: File,
  providedToken: string,
  projectName?: string,
  categoryName?: string
): Promise<{ id: string; webViewLink: string; mimeType: string; folderId?: string }> {
  try {
    const boundary = 'dfw_gdrive_upload_boundary';
    let targetFolderId: string | undefined;

    // Resolve permanent token dynamically
    const accessToken = await getOrRefreshAccessToken().catch(() => providedToken);

    // 1. Automatically resolve or build foldering hierarchy (Using "Monitoring Sistem V3" as primary)
    const appRootFolderId = await getOrCreateFolder("Monitoring Sistem V3", accessToken);
    targetFolderId = appRootFolderId;

    if (projectName) {
      const projectFolderId = await getOrCreateFolder(projectName, accessToken, appRootFolderId);
      targetFolderId = projectFolderId;

      if (categoryName) {
        const categoryFolderId = await getOrCreateFolder(categoryName, accessToken, projectFolderId);
        targetFolderId = categoryFolderId;
      }
    }

    const metadata: any = {
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
    };

    if (targetFolderId) {
      metadata.parents = [targetFolderId];
    }

    // Read file in as an ArrayBuffer
    const reader = new FileReader();
    const fileDataPromise = new Promise<ArrayBuffer>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = (err) => reject(err);
    });
    reader.readAsArrayBuffer(file);
    const fileData = await fileDataPromise;

    // Build the multipart request body
    const metadataPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
    const mediaPartHeader = `--${boundary}\r\nContent-Type: ${metadata.mimeType}\r\n\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const blob = new Blob([
      metadataPart,
      mediaPartHeader,
      new Uint8Array(fileData),
      closeDelim
    ]);

    // Send to Google Drive Upload API
    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,mimeType',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: blob,
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google Drive API error: ${response.status} ${response.statusText} - ${errText}`);
    }

    const result = await response.json();
    return {
      id: result.id,
      webViewLink: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
      mimeType: result.mimeType || file.type || 'application/octet-stream',
      folderId: targetFolderId
    };
  } catch (error: any) {
    console.error('Failed to upload file to Google Drive with automatic folders:', error);
    throw error;
  }
}

export async function deleteFileFromGoogleDrive(
  fileId: string,
  providedToken: string
): Promise<boolean> {
  try {
    // Resolve permanent token dynamically
    const accessToken = await getOrRefreshAccessToken().catch(() => providedToken);

    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 204 || response.ok) {
      return true;
    } else {
      const errText = await response.text();
      console.warn(`Gagal menghapus file di Google Drive: ${response.status} - ${errText}`);
      throw new Error(`Google Drive delete error: ${response.status} - ${errText}`);
    }
  } catch (error) {
    console.error(`Failed to delete file ${fileId} from Google Drive:`, error);
    throw error;
  }
}
