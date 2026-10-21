export const MANAGEMENT_UPDATED = 'management-updated';
export const notifyManagementUpdated = () => window.dispatchEvent(new Event(MANAGEMENT_UPDATED));
