
import type { IOrganization } from './types';
import { OrganizationStore } from './store';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, html?: string) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

export class App {
  private root: HTMLElement;
  private store = new OrganizationStore();
  private q = '';
  private sortField: 'name' | 'director' | null = null;
  private sortDir: 'asc' | 'desc' = 'asc';
  private page = 1;
  private pageSize = 5;
  private searchInput!: HTMLInputElement;
  private addBtn!: HTMLButtonElement;
  private tableBody!: HTMLElement;
  private pagerNode!: HTMLElement;

  constructor(rootSelector = '#app') {
    const r = document.querySelector(rootSelector);
    if (!r) throw new Error('Root container not found');
    this.root = r as HTMLElement;
    this.renderBase();
    this.bind();
    this.renderList();
  }

  private renderBase() {
    this.root.innerHTML = '';
    const h = el('div', 'toolbar');
    this.searchInput = el('input', 'search') as HTMLInputElement;
    this.searchInput.placeholder = 'Найти по ФИО...';
    this.addBtn = el('button', 'btn-add', 'Добавить') as HTMLButtonElement;
    h.append(this.searchInput, this.addBtn);
    const tableWrap = el('div', 'table-wrap');
    const table = el('table', 'org-table') as HTMLTableElement;
    table.innerHTML = `
      <thead>
        <tr>
          <th data-sort="name">Название</th>
          <th data-sort="director">ФИО директора</th>
          <th>Номер телефона</th>
          <th>Адрес</th>
          <th></th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    this.tableBody = table.querySelector('tbody') as HTMLElement;
    tableWrap.append(table);

    this.pagerNode = el('div', 'pager');

    this.root.append(h, tableWrap, this.pagerNode);
  }

  private bind() {
    let tOut: number | undefined;
    this.searchInput.addEventListener('input', () => {
      if (tOut) window.clearTimeout(tOut);
      tOut = window.setTimeout(() => {
        this.q = this.searchInput.value;
        this.page = 1;
        this.renderList();
      }, 150);
    });

    this.addBtn.addEventListener('click', () => {
      this.openModal('Добавить организацию', null);
    });

    const table = this.root.querySelector('table')!;
    table.addEventListener('click', (ev) => {
      const th = (ev.target as HTMLElement).closest('th[data-sort]') as HTMLElement | null;
      if (!th) return;
      const field = th.dataset.sort as 'name' | 'director';
      if (this.sortField === field) {
        this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortField = field;
        this.sortDir = 'asc';
      }
      this.renderList();
    });

    this.tableBody.addEventListener('click', (ev) => {
      const target = ev.target as HTMLElement;
      const del = target.closest('.del-btn') as HTMLElement | null;
      if (del) {
        return;
      }
      const row = (target.closest('tr') as HTMLTableRowElement | null);
      if (!row) return;
      const id = row.dataset.id!;
      const org = this.store.all().find(x => x.id === id)!;
      this.openModal('Редактировать организацию', org);
    });
  }

  private renderList() {
    const res = this.store.query({
      q: this.q,
      sortField: this.sortField,
      sortDir: this.sortDir,
      page: this.page,
      pageSize: this.pageSize
    });

    this.tableBody.innerHTML = '';
    for (const it of res.items) {
      const tr = el('tr') as HTMLTableRowElement;
      tr.dataset.id = it.id;
      const addr = `${it.address.city}, ${it.address.street}, ${it.address.house}`;
      tr.innerHTML = `
        <td>${escapeHtml(it.name)}</td>
        <td>${escapeHtml(it.director)}</td>
        <td>${escapeHtml(it.phone)}</td>
        <td>${escapeHtml(addr)}</td>
        <td><button class="del-btn" data-id="${it.id}" title="Удалить">✕</button></td>
      `;
      const delBtn = tr.querySelector('.del-btn') as HTMLButtonElement;
      delBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const id = delBtn.dataset.id!;
        if (confirm('Удалить запись?')) {
          this.store.delete(id);
          const next = this.store.query({ q: this.q, sortField: this.sortField, sortDir: this.sortDir, page: this.page, pageSize: this.pageSize });
          if (this.page > 1 && next.items.length === 0) {
            this.page--;
          }
          this.renderList();
        }
      });

      this.tableBody.appendChild(tr);
    }

    this.renderPager(res.page, res.totalPages);
    this.updateSortIndicators();
  }

  private updateSortIndicators() {
    const ths = this.root.querySelectorAll('th[data-sort]');
    ths.forEach(th => {
      th.classList.remove('sort-asc', 'sort-desc');
      const f = th.getAttribute('data-sort') as 'name' | 'director';
      if (this.sortField === f) {
        th.classList.add(this.sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
      }
    });
  }

  private renderPager(page: number, totalPages: number) {
    this.pagerNode.innerHTML = '';
    const wrap = el('div', 'pager-wrap');
    const prev = el('button', 'pager-btn', '◀') as HTMLButtonElement;
    prev.disabled = page <= 1;
    prev.addEventListener('click', () => { this.page = Math.max(1, this.page - 1); this.renderList(); });
    wrap.appendChild(prev);

    const info = el('span', 'pager-info', `Страница ${page} из ${totalPages}`);
    wrap.appendChild(info);

    const next = el('button', 'pager-btn', '▶') as HTMLButtonElement;
    next.disabled = page >= totalPages;
    next.addEventListener('click', () => { this.page = Math.min(totalPages, this.page + 1); this.renderList(); });
    wrap.appendChild(next);

    this.pagerNode.appendChild(wrap);
  }

  private openModal(title: string, org: IOrganization | null) {
    const modal = el('div', 'modal') as HTMLDivElement;
    const dialog = el('div', 'modal-dialog');
    modal.appendChild(dialog);
    dialog.innerHTML = `
      <h3>${escapeHtml(title)}</h3>
      <form class="org-form">
        <label>Название <input name="name" required></label>
        <label>ФИО директора <input name="director" required></label>
        <label>Номер телефона <input name="phone" required></label>
        <fieldset class="address">
          <legend>Адрес</legend>
          <label>Город <input name="city" required></label>
          <label>Улица <input name="street" required></label>
          <label>Дом <input name="house" required></label>
        </fieldset>
        <div class="actions">
          <button type="button" class="btn-cancel">Отмена</button>
          <button type="submit" class="btn-ok" disabled>OK</button>
        </div>
      </form>
    `;

    document.body.appendChild(modal);

    const form = dialog.querySelector('form') as HTMLFormElement;
    const inputs = Array.from(form.querySelectorAll('input')) as HTMLInputElement[];
    const btnOk = form.querySelector('.btn-ok') as HTMLButtonElement;
    const btnCancel = form.querySelector('.btn-cancel') as HTMLButtonElement;

    if (org) {
      (form.querySelector('input[name="name"]') as HTMLInputElement).value = org.name;
      (form.querySelector('input[name="director"]') as HTMLInputElement).value = org.director;
      (form.querySelector('input[name="phone"]') as HTMLInputElement).value = org.phone;
      (form.querySelector('input[name="city"]') as HTMLInputElement).value = org.address.city;
      (form.querySelector('input[name="street"]') as HTMLInputElement).value = org.address.street;
      (form.querySelector('input[name="house"]') as HTMLInputElement).value = org.address.house;
    }

    const checkValidity = () => {
      const ok = inputs.every(i => i.value.trim() !== '');
      btnOk.disabled = !ok;
    };

    inputs.forEach(i => i.addEventListener('input', checkValidity));
    checkValidity();

    btnCancel.addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const data = {
        name: (form.querySelector('input[name="name"]') as HTMLInputElement).value.trim(),
        director: (form.querySelector('input[name="director"]') as HTMLInputElement).value.trim(),
        phone: (form.querySelector('input[name="phone"]') as HTMLInputElement).value.trim(),
        address: {
          city: (form.querySelector('input[name="city"]') as HTMLInputElement).value.trim(),
          street: (form.querySelector('input[name="street"]') as HTMLInputElement).value.trim(),
          house: (form.querySelector('input[name="house"]') as HTMLInputElement).value.trim()
        }
      };

      if (org) {
        this.store.update({ ...org, ...data });
      } else {
        const newOrg: IOrganization = {
          id: String(Date.now()) + Math.random().toString(36).slice(2, 6),
          ...data
        };
        this.store.add(newOrg);
      }
      document.body.removeChild(modal);
      this.renderList();
    });

    modal.addEventListener('click', (ev) => {
      if (ev.target === modal) {
        document.body.removeChild(modal);
      }
    });

    (inputs[0] || inputs[0]).focus();
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (m) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m] || m));
}
