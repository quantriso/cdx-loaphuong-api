import { CreateContentHandler } from './create-content.handler';
import { UpdateContentHandler } from './update-content.handler';
import { SubmitContentForApprovalHandler } from './submit-content-for-approval.handler';
import { ApproveContentHandler } from './approve-content.handler';
import { RejectContentHandler } from './reject-content.handler';
import { PublishContentHandler } from './publish-content.handler';
import { ArchiveContentHandler } from './archive-content.handler';
import { BulkPublishContentHandler } from './bulk-publish-content.handler';
import { BulkArchiveContentHandler } from './bulk-archive-content.handler';

export const CommandHandlers = [
  CreateContentHandler,
  UpdateContentHandler,
  SubmitContentForApprovalHandler,
  ApproveContentHandler,
  RejectContentHandler,
  PublishContentHandler,
  ArchiveContentHandler,
  BulkPublishContentHandler,
  BulkArchiveContentHandler,
];

export * from './create-content.handler';
export * from './update-content.handler';
export * from './submit-content-for-approval.handler';
export * from './approve-content.handler';
export * from './reject-content.handler';
export * from './publish-content.handler';
export * from './archive-content.handler';
export * from './bulk-publish-content.handler';
export * from './bulk-archive-content.handler';
