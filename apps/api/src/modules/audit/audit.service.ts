import { Injectable } from '@nestjs/common';

@Injectable()
export class AuditService {
  async findAll(user?: string, action?: string) {
    const items = [
      { id: 'AUD-1001', user: 'RM-101', action: 'VIEW_PROFILE', timestamp: '2026-09-07T09:15:00Z', details: 'Viewed customer C-1001' },
      { id: 'AUD-1002', user: 'OPS-205', action: 'UPDATE_SR', timestamp: '2026-09-07T09:18:00Z', details: 'Updated service request SR-1002' },
      { id: 'AUD-1003', user: 'MAN-10', action: 'AI_SUMMARY', timestamp: '2026-09-07T09:25:00Z', details: 'Generated AI customer summary' },
    ];

    const filtered = items.filter((item) => {
      const matchesUser = !user || item.user.toLowerCase().includes(user.toLowerCase());
      const matchesAction = !action || item.action.toLowerCase().includes(action.toLowerCase());
      return matchesUser && matchesAction;
    });

    return {
      items: filtered,
      total: filtered.length,
    };
  }
}
