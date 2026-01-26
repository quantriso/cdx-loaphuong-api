import { CreateContentHandler } from './create-content.handler';
import { UpdateContentHandler } from './update-content.handler';
import { SubmitContentForApprovalHandler } from './submit-content-for-approval.handler';
import { ApproveContentHandler } from './approve-content.handler';

export const CommandHandlers = [
  CreateContentHandler,
  UpdateContentHandler,
  SubmitContentForApprovalHandler,
  ApproveContentHandler,
];

export * from './create-content.handler';
export * from './update-content.handler';
export * from './submit-content-for-approval.handler';
export * from './approve-content.handler';
