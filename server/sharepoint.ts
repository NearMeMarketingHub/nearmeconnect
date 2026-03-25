// SharePoint integration using Microsoft Graph API
// Connection: conn_sharepoint_01KF3NRTF8YJQ57QFVDBNMRRKG
import { Client } from '@microsoft/microsoft-graph-client';

let connectionSettings: any = null;

function clearTokenCache() {
  connectionSettings = null;
}

function isTokenExpiredError(error: any): boolean {
  const msg = (error?.message || '').toLowerCase();
  return msg.includes('token is expired') ||
    msg.includes('lifetime validation failed') ||
    msg.includes('invalid_token') ||
    msg.includes('unauthorized') ||
    msg.includes('401') ||
    error?.statusCode === 401;
}

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings?.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  clearTokenCache();
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X-Replit-Token not found for repl/depl');
  }

  const response = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=sharepoint',
    {
      headers: {
        'Accept': 'application/json',
        'X-Replit-Token': xReplitToken
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch SharePoint connection: HTTP ${response.status}`);
  }

  const data = await response.json();
  connectionSettings = data.items?.[0];

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    clearTokenCache();
    throw new Error('SharePoint not connected');
  }

  if (connectionSettings.settings?.expires_at && new Date(connectionSettings.settings.expires_at).getTime() <= Date.now()) {
    console.error('SharePoint token from connector API is already expired (expires_at:', connectionSettings.settings.expires_at, ')');
    clearTokenCache();
    throw new Error('SharePoint token is expired. Please re-authorize the SharePoint connection.');
  }

  return accessToken;
}

async function getSharePointClient() {
  const accessToken = await getAccessToken();

  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => accessToken
    }
  });
}

async function getSharePointClientWithRetry(): Promise<Client> {
  try {
    return await getSharePointClient();
  } catch (error: any) {
    if (isTokenExpiredError(error)) {
      console.log('SharePoint token expired on first attempt, clearing cache and retrying...');
      clearTokenCache();
      return await getSharePointClient();
    }
    throw error;
  }
}

async function withTokenRetry<T>(operation: (client: Client) => Promise<T>): Promise<T> {
  const client = await getSharePointClientWithRetry();
  try {
    return await operation(client);
  } catch (error: any) {
    if (isTokenExpiredError(error)) {
      console.log('SharePoint API call failed with token error, clearing cache and retrying...');
      clearTokenCache();
      const freshClient = await getSharePointClient();
      return await operation(freshClient);
    }
    throw error;
  }
}

const SHAREPOINT_HOST = "nearmemarketing.sharepoint.com";
const SITE_PATH = "/sites/AppStorage";
const BASE_FOLDER = "Near Me Marketing";

interface UploadResult {
  success: boolean;
  webUrl?: string;
  path?: string;
  error?: string;
}

const SIMPLE_UPLOAD_MAX = 4 * 1024 * 1024;
const CHUNK_SIZE = 10 * 1024 * 1024;

export async function uploadToSharePoint(
  companyName: string,
  fileName: string,
  fileBuffer: Buffer,
  contentType: string,
  subfolder?: string,
  clientType?: "marketing" | "government",
  skipYearMonth?: boolean
): Promise<UploadResult> {
  try {
    return await withTokenRetry(async (client) => {
      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      const safeCompanyName = companyName.replace(/[<>:"/\\|?*]/g, '_').trim();
      const safeFileName = fileName.replace(/[<>:"/\\|?*]/g, '_').trim();
      const safeSubfolder = subfolder ? `/${subfolder.split('/').map(seg => seg.replace(/[<>:"/\\|?*]/g, '_').trim()).filter(Boolean).join('/')}` : '';
      
      const typeFolder = clientType === "government" ? "Government" : "Marketing";
      
      const folderPath = skipYearMonth
        ? `${BASE_FOLDER}/${typeFolder}/${safeCompanyName}${safeSubfolder}`
        : `${BASE_FOLDER}/${typeFolder}/${safeCompanyName}${safeSubfolder}/${yearMonth}`;
      
      let siteId: string;
      
      try {
        const siteResponse = await client.api(`/sites/${SHAREPOINT_HOST}:${SITE_PATH}`).get();
        siteId = siteResponse.id;
        console.log('Successfully connected to SharePoint site:', siteResponse.displayName);
      } catch (siteError: any) {
        console.error('Failed to access SharePoint site:', siteError.message);
        if (isTokenExpiredError(siteError)) {
          throw siteError;
        }
        throw new Error(`Cannot access SharePoint site. Please ensure the connection has permissions to ${SHAREPOINT_HOST}${SITE_PATH}`);
      }
      
      const drivesResponse = await client.api(`/sites/${siteId}/drives`).get();
      
      if (!drivesResponse.value || drivesResponse.value.length === 0) {
        throw new Error('No document libraries found');
      }
      
      const driveId = drivesResponse.value[0].id;
      const uploadPath = `/${folderPath}/${safeFileName}`;
      
      let uploadResponse: any;
      
      if (fileBuffer.length <= SIMPLE_UPLOAD_MAX) {
        uploadResponse = await client
          .api(`/drives/${driveId}/root:${uploadPath}:/content`)
          .put(fileBuffer);
      } else {
        const sessionResponse = await client
          .api(`/drives/${driveId}/root:${uploadPath}:/createUploadSession`)
          .post({
            item: {
              "@microsoft.graph.conflictBehavior": "rename",
              name: safeFileName
            }
          });
        
        const uploadUrl = sessionResponse.uploadUrl;
        const fileSize = fileBuffer.length;
        
        let start = 0;
        while (start < fileSize) {
          const end = Math.min(start + CHUNK_SIZE, fileSize);
          const chunk = fileBuffer.slice(start, end);
          
          const response = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Length': chunk.length.toString(),
              'Content-Range': `bytes ${start}-${end - 1}/${fileSize}`,
            },
            body: chunk,
          });
          
          if (!response.ok && response.status !== 202) {
            const errorText = await response.text();
            throw new Error(`Chunk upload failed: ${errorText}`);
          }
          
          if (end >= fileSize) {
            uploadResponse = await response.json();
          }
          
          start = end;
        }
      }
      
      return {
        success: true,
        webUrl: uploadResponse?.webUrl,
        path: folderPath + '/' + safeFileName,
      };
    });
  } catch (error: any) {
    console.error('SharePoint upload error:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload to SharePoint',
    };
  }
}

export async function testSharePointConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    const client = await getSharePointClientWithRetry();
    await client.api('/me').get();
    return { connected: true };
  } catch (error: any) {
    return { connected: false, error: error.message };
  }
}

interface DownloadResult {
  success: boolean;
  buffer?: Buffer;
  contentType?: string;
  fileName?: string;
  error?: string;
}

export async function downloadFromSharePoint(
  driveId: string,
  itemId: string
): Promise<DownloadResult> {
  try {
    return await withTokenRetry(async (client) => {
      const itemMetadata = await client.api(`/drives/${driveId}/items/${itemId}`).get();
      const fileName = itemMetadata.name;
      const contentType = itemMetadata.file?.mimeType || 'application/octet-stream';
      
      const downloadUrl = itemMetadata['@microsoft.graph.downloadUrl'];
      
      if (!downloadUrl) {
        throw new Error('Could not get download URL for file');
      }
      
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      return {
        success: true,
        buffer,
        contentType,
        fileName,
      };
    });
  } catch (error: any) {
    console.error('SharePoint download error:', error);
    return {
      success: false,
      error: error.message || 'Failed to download from SharePoint',
    };
  }
}

interface UploadResultWithIds extends UploadResult {
  driveId?: string;
  itemId?: string;
}

export async function uploadToSharePointWithIds(
  companyName: string,
  fileName: string,
  fileBuffer: Buffer,
  contentType: string,
  subfolder?: string,
  clientType?: "marketing" | "government"
): Promise<UploadResultWithIds> {
  try {
    return await withTokenRetry(async (client) => {
      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      const safeCompanyName = companyName.replace(/[<>:"/\\|?*]/g, '_').trim();
      const safeFileName = fileName.replace(/[<>:"/\\|?*]/g, '_').trim();
      const safeSubfolder = subfolder ? `/${subfolder.split('/').map(seg => seg.replace(/[<>:"/\\|?*]/g, '_').trim()).filter(Boolean).join('/')}` : '';
      
      const typeFolder = clientType === "government" ? "Government" : "Marketing";
      const folderPath = `${BASE_FOLDER}/${typeFolder}/${safeCompanyName}${safeSubfolder}/${yearMonth}`;
      
      let siteId: string;
      
      try {
        const siteResponse = await client.api(`/sites/${SHAREPOINT_HOST}:${SITE_PATH}`).get();
        siteId = siteResponse.id;
      } catch (siteError: any) {
        console.error('Failed to access SharePoint site:', siteError.message);
        if (isTokenExpiredError(siteError)) {
          throw siteError;
        }
        throw new Error(`Cannot access SharePoint site. Please ensure the connection has permissions to ${SHAREPOINT_HOST}${SITE_PATH}`);
      }
      
      const drivesResponse = await client.api(`/sites/${siteId}/drives`).get();
      
      if (!drivesResponse.value || drivesResponse.value.length === 0) {
        throw new Error('No document libraries found');
      }
      
      const driveId = drivesResponse.value[0].id;
      const uploadPath = `/${folderPath}/${safeFileName}`;
      
      let uploadResponse: any;
      
      if (fileBuffer.length <= SIMPLE_UPLOAD_MAX) {
        uploadResponse = await client
          .api(`/drives/${driveId}/root:${uploadPath}:/content`)
          .put(fileBuffer);
      } else {
        const sessionResponse = await client
          .api(`/drives/${driveId}/root:${uploadPath}:/createUploadSession`)
          .post({
            item: {
              "@microsoft.graph.conflictBehavior": "rename",
              name: safeFileName
            }
          });
        
        const uploadUrl = sessionResponse.uploadUrl;
        const fileSize = fileBuffer.length;
        
        let start = 0;
        while (start < fileSize) {
          const end = Math.min(start + CHUNK_SIZE, fileSize);
          const chunk = fileBuffer.slice(start, end);
          
          const response = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Length': chunk.length.toString(),
              'Content-Range': `bytes ${start}-${end - 1}/${fileSize}`,
            },
            body: chunk,
          });
          
          if (!response.ok && response.status !== 202) {
            const errorText = await response.text();
            throw new Error(`Chunk upload failed: ${errorText}`);
          }
          
          if (end >= fileSize) {
            uploadResponse = await response.json();
          }
          
          start = end;
        }
      }
      
      return {
        success: true,
        webUrl: uploadResponse?.webUrl,
        path: folderPath + '/' + safeFileName,
        driveId: driveId,
        itemId: uploadResponse?.id,
      };
    });
  } catch (error: any) {
    console.error('SharePoint upload error:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload to SharePoint',
    };
  }
}

export async function deleteFromSharePoint(
  driveId: string,
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    return await withTokenRetry(async (client) => {
      await client.api(`/drives/${driveId}/items/${itemId}`).delete();
      return { success: true };
    });
  } catch (error: any) {
    console.error('SharePoint delete error:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete from SharePoint',
    };
  }
}
