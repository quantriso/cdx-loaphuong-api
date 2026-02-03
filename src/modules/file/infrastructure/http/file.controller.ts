import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  BadRequestException,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
  Req,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  UploadFileCommand,
  ProcessFileCommand,
  DeleteFileCommand,
  DownloadFileCommand,
} from '../../application/commands';
import { GetFileQuery, GetFileListQuery } from '../../application/queries';
import {
  FileDto,
  FileUploadResponseDto,
  FileSearchDto,
} from '../../application/dtos/file.dto';

/**
 * File Controller
 *
 * REST API endpoints for file management
 *
 * Endpoints:
 * - POST /files - Upload file
 * - POST /files/:id/process - Process uploaded images
 * - GET /files/:id - Get single file
 * - GET /files - Get file list with pagination
 * - GET /files/:id/download - Download file
 * - DELETE /files/:id - Delete file
 */
@ApiTags('Files')
@ApiBearerAuth()
@Controller('api/v1/files')
export class FileController {
  private readonly logger = new Logger(FileController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * Upload File
   *
   * Story 5.1: Upload File
   *
   * Uploads a file to system and stores metadata in the database.
   * Emits FileUploadedEvent upon success.
   */
  @Post()
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    type: FileUploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid file',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async uploadFile(@Req() req: any) {
    this.logger.debug('Upload file called');

    try {
      console.log('[UPLOAD DEBUG] Starting upload');
      console.log('[UPLOAD DEBUG] Request type:', req.constructor.name);
      console.log('[UPLOAD DEBUG] Has file method:', typeof req.file);

      const data = await req.file();

      if (!data || !data.file) {
        this.logger.warn('File is missing in request');
        console.log('[UPLOAD DEBUG] No file data received');
        throw new BadRequestException('File is required');
      }

      this.logger.debug(
        `File details: ${data.filename}, mimetype: ${data.mimetype}`,
      );
      console.log('[UPLOAD DEBUG] File data received:', {
        filename: data.filename,
        mimetype: data.mimetype,
        fieldname: data.fieldname,
        encoding: data.encoding,
      });

      const buffer = await data.toBuffer();
      console.log('[UPLOAD DEBUG] Buffer length:', buffer.length);

      const tenantId = req.user?.tenantId || 'mock-tenant-id';
      const uploadedBy = req.user?.id || 'mock-user-id';

      const command = new UploadFileCommand(
        {
          originalname: data.filename,
          mimetype: data.mimetype,
          size: data.file?.bytesRead || buffer.length,
          buffer: buffer,
          fieldname: data.fieldname,
          encoding: data.encoding,
        },
        tenantId,
        uploadedBy,
      );
      const result = await this.commandBus.execute(command);

      console.log('[UPLOAD DEBUG] Upload successful:', result);
      return result;
    } catch (error) {
      console.error('[UPLOAD DEBUG] Error occurred:', error);
      console.error('[UPLOAD DEBUG] Error stack:', error.stack);
      this.logger.error(`Error uploading file: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Process Uploaded Images
   *
   * Story 5.3: Process Uploaded Images
   *
   * Processes uploaded images by resizing, creating thumbnails, and optimizing.
   * Only works for IMAGE type files.
   * Emits FileProcessedEvent upon success.
   */
  @Post(':id/process')
  @ApiOperation({ summary: 'Process an uploaded image' })
  @ApiResponse({
    status: 200,
    description: 'Image processed successfully',
    type: FileDto,
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
  @HttpCode(HttpStatus.OK)
  async processFile(
    @Param('id') fileId: string,
    @Body() dto: any,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || 'mock-tenant-id';
    const processedBy = req.user?.id || 'mock-user-id';

    const command = new ProcessFileCommand(
      fileId,
      processedBy,
      tenantId,
      dto.options,
    );
    return this.commandBus.execute(command);
  }

  /**
   * Get Single File
   *
   * Retrieves metadata for a single file by ID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single file' })
  @ApiResponse({
    status: 200,
    description: 'File retrieved successfully',
    type: FileDto,
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
  async getFile(@Param('id') fileId: string, @Req() req: any) {
    const tenantId = req.user?.tenantId || 'mock-tenant-id';

    const query = new GetFileQuery(fileId, tenantId);
    return this.queryBus.execute(query);
  }

  /**
   * Get File List
   *
   * Story 5.1: Upload File
   * Story 5.4: Download File
   *
   * Retrieves a paginated list of files with filtering and sorting options.
   */
  @Get()
  @ApiOperation({ summary: 'Get list of files' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'fileType', required: false, type: String })
  @ApiQuery({ name: 'uploadedBy', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Files retrieved successfully',
    type: FileSearchDto,
  })
  async getFileList(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('sortBy', new DefaultValuePipe('createdAt')) sortBy: string,
    @Query('sortOrder', new DefaultValuePipe('desc')) sortOrder: string,
    @Query('fileType') fileType?: string,
    @Query('uploadedBy') uploadedBy?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const tenantId = 'mock-tenant-id';

    const query = new GetFileListQuery(
      tenantId,
      page,
      limit,
      fileType,
      uploadedBy,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
    );
    return this.queryBus.execute(query);
  }

  /**
   * Download File
   *
   * Story 5.4: Download File
   *
   * Downloads a file from storage.
   * Supports downloading different versions: original, processed, thumbnail.
   */
  @Get(':id/download')
  @ApiOperation({ summary: 'Download a file' })
  @ApiQuery({
    name: 'version',
    required: false,
    enum: ['original', 'processed', 'thumbnail'],
    example: 'original',
  })
  @ApiResponse({
    status: 200,
    description: 'File downloaded successfully',
    content: {
      'application/octet-stream': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
  async downloadFile(
    @Param('id') fileId: string,
    @Query('version') version?: string,
    @Req() req?: any,
  ) {
    const tenantId = req?.user?.tenantId || 'mock-tenant-id';

    const command = new DownloadFileCommand(fileId, tenantId);
    const result = await this.commandBus.execute(command);
    return {
      fileBuffer: result.fileBuffer,
      mimeType: result.mimeType,
      fileName: result.fileName,
    };
  }

  /**
   * Delete File
   *
   * Story 5.5: Delete File
   *
   * Deletes a file from storage and marks it as deleted in the database.
   * Emits FileDeletedEvent upon success.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a file' })
  @ApiResponse({
    status: 200,
    description: 'File deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
  async deleteFile(@Param('id') fileId: string, @Req() req: any) {
    const tenantId = req.user?.tenantId || 'mock-tenant-id';

    const command = new DeleteFileCommand(fileId, tenantId, tenantId);
    await this.commandBus.execute(command);
    return { message: 'File deleted successfully' };
  }
}
