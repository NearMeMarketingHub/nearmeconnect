import { objectStorageClient } from "./replit_integrations/object_storage/objectStorage";

function getPrivateDir(): string {
  const dir = process.env.PRIVATE_OBJECT_DIR || "";
  if (!dir) {
    throw new Error("PRIVATE_OBJECT_DIR not set");
  }
  return dir;
}

function parseFullPath(fullPath: string): { bucketName: string; objectName: string } {
  let path = fullPath;
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const parts = path.split("/");
  if (parts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }
  return {
    bucketName: parts[1],
    objectName: parts.slice(2).join("/"),
  };
}

export async function uploadBuffer(relativePath: string, buffer: Buffer, contentType: string): Promise<string> {
  const privateDir = getPrivateDir();
  const fullPath = `${privateDir}/${relativePath}`;
  const { bucketName, objectName } = parseFullPath(fullPath);

  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file(objectName);

  await file.save(buffer, {
    metadata: { contentType },
    resumable: false,
  });

  return fullPath;
}

export async function downloadBuffer(relativePath: string): Promise<{ buffer: Buffer; contentType: string }> {
  const privateDir = getPrivateDir();
  const fullPath = relativePath.startsWith("/") ? relativePath : `${privateDir}/${relativePath}`;
  const { bucketName, objectName } = parseFullPath(fullPath);

  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file(objectName);

  const [exists] = await file.exists();
  if (!exists) {
    throw new Error(`Object not found: ${relativePath}`);
  }

  const [contents] = await file.download();
  const [metadata] = await file.getMetadata();

  return {
    buffer: Buffer.from(contents),
    contentType: (metadata.contentType as string) || "application/octet-stream",
  };
}

export async function deleteObject(relativePath: string): Promise<void> {
  const privateDir = getPrivateDir();
  const fullPath = relativePath.startsWith("/") ? relativePath : `${privateDir}/${relativePath}`;
  const { bucketName, objectName } = parseFullPath(fullPath);

  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file(objectName);

  const [exists] = await file.exists();
  if (exists) {
    await file.delete();
  }
}
