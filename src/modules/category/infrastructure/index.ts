export * from './persistence';
export * from './http';
export * from './projections';

// Export event handlers for module registration
import { CategoryReadModelProjection } from './projections';

export const EventHandlers = [CategoryReadModelProjection];
