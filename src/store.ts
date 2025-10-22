import type { IOrganization } from './types';

const STORAGE_KEY = 'org_directory_v1';

export type SortField = 'name' | 'director' | null;
export type SortDir = 'asc' | 'desc';

export class OrganizationStore {
  private items: IOrganization[] = [];

  constructor() {
    this.load();
  }

  private save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
  }

  private load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        this.items = JSON.parse(raw);
      } catch {
        this.items = [];
      }
    } else {
      this.items = [
        {
          id: String(Date.now() - 1000),
          name: 'ООО "Вектор"',
          director: 'Иванов И.И.',
          phone: '+7 000 123 45 67',
          address: { city: 'г. Москва', street: 'ул. Ленина', house: 'д. 1' }
        },
        {
          id: String(Date.now() - 900),
          name: 'ИП Сидоров',
          director: 'Сидоров С.С.',
          phone: '+7 000 56 78 99',
          address: { city: 'г. Санкт-Петербург', street: 'пр. Невский', house: 'д. 2' }
        }
      ];
      this.save();
    }
  }

  all(): IOrganization[] {
    return [...this.items];
  }

  add(org: IOrganization) {
    this.items.unshift(org);
    this.save();
  }

  update(updated: IOrganization) {
    const i = this.items.findIndex(x => x.id === updated.id);
    if (i >= 0) {
      this.items[i] = updated;
      this.save();
    }
  }

  delete(id: string) {
    this.items = this.items.filter(x => x.id !== id);
    this.save();
  }

  query(options: {
    q?: string;
    sortField?: SortField;
    sortDir?: SortDir;
    page?: number;
    pageSize?: number;
  }) {
    let list = [...this.items];

    if (options.q && options.q.trim() !== '') {
      const q = options.q.trim().toLowerCase();
      list = list.filter(item => item.director.toLowerCase().includes(q));
    }

    if (options.sortField) {
      const f = options.sortField;
      const dir = options.sortDir === 'desc' ? -1 : 1;
      list.sort((a, b) => {
        const va = (a[f] || '') as string;
        const vb = (b[f] || '') as string;
        return va.localeCompare(vb, 'ru') * dir;
      });
    }

    const total = list.length;

    const pageSize = options.pageSize ?? 5;
    const page = Math.max(1, options.page ?? 1);
    const start = (page - 1) * pageSize;
    const pageItems = list.slice(start, start + pageSize);

    return {
      items: pageItems,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    };
  }
}
