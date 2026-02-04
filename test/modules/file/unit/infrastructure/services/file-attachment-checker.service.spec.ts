import { Test, TestingModule } from '@nestjs/testing';
import { FileAttachmentCheckerService } from '@modules/file/infrastructure/services/file-attachment-checker.service';
import { FILE_ATTACHMENT_CHECKER_TOKEN } from '@modules/file/constants/tokens';

describe('FileAttachmentCheckerService', () => {
  let service: FileAttachmentCheckerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: FILE_ATTACHMENT_CHECKER_TOKEN,
          useClass: FileAttachmentCheckerService,
        },
      ],
    }).compile();

    service = module.get<FileAttachmentCheckerService>(
      FILE_ATTACHMENT_CHECKER_TOKEN,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkFileUsage', () => {
    it('should pass when no attachments found', async () => {
      const fileId = 'test-file-id';

      await expect(service.checkFileUsage(fileId)).resolves.not.toThrow();
    });

    // TODO: Add test cases when actual attachment checking is implemented
    // it('should throw FileInUseException when file is attached to content', async () => {
    //   const fileId = 'attached-file-id';
    //   await expect(service.checkFileUsage(fileId)).rejects.toThrow(
    //     FileInUseException,
    //   );
    // });
  });

  describe('getFileUsageDetails', () => {
    it('should return no usage when file is not in use', async () => {
      const fileId = 'test-file-id';

      const result = await service.getFileUsageDetails(fileId);

      expect(result).toEqual({
        isInUse: false,
        usageContexts: [],
      });
    });

    // TODO: Add test cases when actual usage details retrieval is implemented
    // it('should return usage details when file is in use', async () => {
    //   const fileId = 'attached-file-id';
    //   const result = await service.getFileUsageDetails(fileId);
    //   expect(result.isInUse).toBe(true);
    //   expect(result.usageContexts).toHaveLength(1);
    // });
  });
});
