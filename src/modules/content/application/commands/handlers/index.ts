import { CreateContentHandler } from "./create-content.handler";
import { UpdateContentHandler } from "./update-content.handler";

export const CommandHandlers = [CreateContentHandler, UpdateContentHandler];

export * from "./create-content.handler";
export * from "./update-content.handler";
