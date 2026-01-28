/**
 * Default Categories Configuration
 *
 * Story 4.2: Initialize Default Categories
 *
 * Defines the 9 predefined categories that are automatically created
 * for each new tenant in the system.
 */

export const DEFAULT_CATEGORIES = [
  {
    value: 'EMERGENCY',
    label: 'Thông báo khẩn cấp',
    description: 'Emergency announcements and alerts',
    color: '#FF0000',
    icon: '🚨',
    sortOrder: 1,
    isActive: true,
  },
  {
    value: 'SERVICES',
    label: 'Dịch vụ công',
    description: 'Public services and administrative procedures',
    color: '#0000FF',
    icon: '🏢',
    sortOrder: 2,
    isActive: true,
  },
  {
    value: 'EVENTS',
    label: 'Sự kiện hoạt động',
    description: 'Community events and activities',
    color: '#800080',
    icon: '📅',
    sortOrder: 3,
    isActive: true,
  },
  {
    value: 'POLICY',
    label: 'Chính sách pháp luật',
    description: 'Policy documents and regulations',
    color: '#4B0082',
    icon: '📜',
    sortOrder: 4,
    isActive: true,
  },
  {
    value: 'HEALTH',
    label: 'Y tế sức khỏe',
    description: 'Health information and medical services',
    color: '#008000',
    icon: '🏥',
    sortOrder: 5,
    isActive: true,
  },
  {
    value: 'EDUCATION',
    label: 'Giáo dục',
    description: 'Education announcements and school information',
    color: '#FF8C00',
    icon: '📚',
    sortOrder: 6,
    isActive: true,
  },
  {
    value: 'INFRASTRUCTURE',
    label: 'Cơ sở hạ tầng',
    description: 'Infrastructure projects and maintenance',
    color: '#808080',
    icon: '🏗️',
    sortOrder: 7,
    isActive: true,
  },
  {
    value: 'GENERAL',
    label: 'Thông báo chung',
    description: 'General announcements',
    color: '#708090',
    icon: '📄',
    sortOrder: 8,
    isActive: true,
  },
  {
    value: 'OTHER',
    label: 'Khác',
    description: 'Other content',
    color: '#000000',
    icon: '📌',
    sortOrder: 9,
    isActive: true,
  },
];

export const DEFAULT_CATEGORIES_COUNT = DEFAULT_CATEGORIES.length;
