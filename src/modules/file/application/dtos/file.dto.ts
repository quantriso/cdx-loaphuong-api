export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  fieldname?: string;
  encoding?: string;
  filename?: string;
  path?: string;
}

export class FileDto {
  id: string;
  tenantId: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  fileType: string;
  storagePath: string;
  storageProvider: string;
  processedPath?: string;
  thumbnailPath?: string;
  processedMetadata?: Record<string, any>;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export class FileUploadDto {
  file: UploadedFile;
  tenantId: string;
  uploadedBy: string;
  storageKey?: string;
}

export class FileUploadResponseDto {
  id: string;
  message: string;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  fileType: string;
  storagePath: string;
  createdAt: Date;
}

export class FileProcessedResponseDto {
  id: string;
  processedPath: string;
  thumbnailPath?: string;
  processedMetadata?: Record<string, any>;
  updatedAt: Date;
}

export class FileDownloadDto {
  fileId: string;
  tenantId: string;
  version: 'original' | 'processed' | 'thumbnail';
}

export class FileProcessDto {
  fileId: string;
  tenantId: string;
  processedBy?: string;
  options?: Record<string, any>;
}

export class FileSearchDto {
  tenantId?: string;
  fileType?: string;
  uploadedBy?: string;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
}
