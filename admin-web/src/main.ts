import './styles.css';

type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: 'CLIENT' | 'ADMIN' | 'MECHANIC';
};

type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

type AdminSummary = {
  metrics: {
    totalUsers: number;
    totalReservations: number;
    upcomingReservations: number;
    pendingReservations: number;
    totalReviews: number;
    activeServices: number;
  };
  recentReservations: Array<{
    id: string;
    serviceLabel: string;
    customerName: string;
    customerEmail: string;
    status: string;
    scheduledAt: string;
    amount: number;
    currency: string;
  }>;
  recentReviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    serviceLabel: string;
    customerName: string;
    createdAt: string;
  }>;
};

type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  vehicleCount: number;
  reservationCount: number;
  reviewCount: number;
  createdAt: string;
};

type AdminReservation = {
  id: string;
  serviceId: string;
  serviceLabel: string;
  customerName: string;
  customerEmail: string;
  status: string;
  scheduledAt: string;
  createdAt: string;
  updatedAt: string;
  amount: number;
  currency: string;
  notes: string | null;
};

type AdminService = {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  slotTimes: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type ApiErrorPayload = {
  message?: string;
};

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
const STORAGE_KEY = 'garage.admin.web.session';

let session: AuthSession | null = loadSession();

function loadSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

function saveSession(nextSession: AuthSession | null) {
  session = nextSession;

  if (nextSession) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

async function parseJson<T>(response: Response) {
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : null;
}

async function refreshSession() {
  if (!session?.refreshToken) {
    return false;
  }

  const response = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      refreshToken: session.refreshToken
    })
  });

  if (!response.ok) {
    saveSession(null);
    return false;
  }

  const payload = await parseJson<AuthSession>(response);
  if (!payload) {
    saveSession(null);
    return false;
  }

  saveSession(payload);
  return true;
}

async function apiRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    retryOnUnauthorized?: boolean;
  } = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(session?.accessToken ? { authorization: `Bearer ${session.accessToken}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (response.status === 401 && options.retryOnUnauthorized !== false) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return apiRequest<T>(path, {
        ...options,
        retryOnUnauthorized: false
      });
    }
  }

  const payload = await parseJson<T | ApiErrorPayload>(response);
  if (!response.ok) {
    throw new Error((payload as ApiErrorPayload | null)?.message || 'Requete admin invalide.');
  }

  return payload as T;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('fr-CA', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('fr-CA', {
    dateStyle: 'medium'
  });
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency
  }).format(value);
}

function createAppShell() {
  const root = document.querySelector<HTMLDivElement>('#app');
  if (!root) {
    throw new Error('Admin root introuvable.');
  }

  root.innerHTML = `
    <main class="shell">
      <section class="hero">
        <div>
          <p class="eyebrow">Garage Mechanic</p>
          <h1>Console administrateur web</h1>
          <p class="hero-copy">
            Un front web separe pour piloter le garage, suivre les donnees utiles et publier de nouveaux services
            sans passer par l'application mobile.
          </p>
        </div>
        <div class="hero-note">
          <strong>API cible</strong>
          <span>${escapeHtml(API_URL)}</span>
        </div>
      </section>

      <section id="login-view" class="panel auth-panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">Acces</p>
            <h2>Connexion administrateur</h2>
            <p>Connecte-toi avec un compte ayant le role <code>ADMIN</code>.</p>
          </div>
        </div>
        <form id="login-form" class="form-grid">
          <label>
            Email
            <input id="login-email" name="email" type="email" placeholder="admin@example.com" required />
          </label>
          <label>
            Mot de passe
            <input id="login-password" name="password" type="password" placeholder="Mot de passe" required />
          </label>
          <div class="form-actions">
            <button type="submit">Se connecter</button>
          </div>
        </form>
        <p id="login-banner" class="banner" hidden></p>
      </section>

      <section id="dashboard-view" hidden>
        <div class="dashboard-toolbar">
          <div>
            <p class="section-kicker">Pilotage</p>
            <h2>Vue d'ensemble atelier</h2>
            <p id="session-copy" class="muted-text">Chargement...</p>
          </div>
          <div class="toolbar-actions">
            <button id="refresh-button" type="button" class="button-secondary">Rafraichir</button>
            <button id="logout-button" type="button" class="button-ghost">Se deconnecter</button>
          </div>
        </div>
        <p id="dashboard-banner" class="banner" hidden></p>

        <section id="metrics-grid" class="metrics-grid"></section>

        <section class="content-grid">
          <article class="panel">
            <div class="panel-heading">
              <div>
                <p class="section-kicker">Catalogue</p>
                <h3>Ajouter un nouveau service</h3>
              </div>
            </div>
            <form id="service-form" class="form-grid">
              <label>
                Libelle
                <input name="label" type="text" placeholder="Entretien climatisation" required />
              </label>
              <label>
                Slug optionnel
                <input name="slug" type="text" placeholder="entretien-climatisation" />
              </label>
              <label class="field-span-2">
                Description
                <textarea name="description" placeholder="Description courte du service"></textarea>
              </label>
              <label>
                Duree (minutes)
                <input name="durationMinutes" type="number" min="1" step="1" placeholder="60" required />
              </label>
              <label>
                Prix (CAD)
                <input name="price" type="number" min="0.01" step="0.01" placeholder="89.99" required />
              </label>
              <label class="field-span-2">
                Horaires
                <input name="slotTimes" type="text" placeholder="09:00, 11:00, 14:00, 16:00" required />
              </label>
              <div class="form-actions">
                <button type="submit">Ajouter le service</button>
              </div>
            </form>
          </article>

          <article class="panel">
            <div class="panel-heading">
              <div>
                <p class="section-kicker">Qualite</p>
                <h3>Avis recents</h3>
              </div>
            </div>
            <div id="recent-reviews" class="stack-list"></div>
          </article>
        </section>

        <section class="content-grid">
          <article class="panel">
            <div class="panel-heading">
              <div>
                <p class="section-kicker">Activite</p>
                <h3>Reservations recentes</h3>
              </div>
            </div>
            <div id="recent-reservations" class="stack-list"></div>
          </article>

          <article class="panel">
            <div class="panel-heading">
              <div>
                <p class="section-kicker">Catalogue</p>
                <h3>Services actifs</h3>
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Duree</th>
                    <th>Prix</th>
                    <th>Horaires</th>
                  </tr>
                </thead>
                <tbody id="services-table"></tbody>
              </table>
            </div>
          </article>
        </section>

        <section class="content-grid">
          <article class="panel">
            <div class="panel-heading">
              <div>
                <p class="section-kicker">Clients</p>
                <h3>Utilisateurs</h3>
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Role</th>
                    <th>Activite</th>
                    <th>Creation</th>
                  </tr>
                </thead>
                <tbody id="users-table"></tbody>
              </table>
            </div>
          </article>

          <article class="panel">
            <div class="panel-heading">
              <div>
                <p class="section-kicker">Planning</p>
                <h3>Toutes les reservations</h3>
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Service</th>
                    <th>Statut</th>
                    <th>Planifie</th>
                  </tr>
                </thead>
                <tbody id="reservations-table"></tbody>
              </table>
            </div>
          </article>
        </section>
      </section>
    </main>
  `;
}

function getElement<T extends Element>(selector: string) {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Element introuvable: ${selector}`);
  }

  return element;
}

function setBanner(target: HTMLElement, message: string, variant: 'success' | 'error') {
  target.hidden = false;
  target.textContent = message;
  target.className = `banner ${variant}`;
}

function clearBanner(target: HTMLElement) {
  target.hidden = true;
  target.textContent = '';
  target.className = 'banner';
}

function renderMetrics(metrics: AdminSummary['metrics']) {
  const root = getElement<HTMLElement>('#metrics-grid');
  const items: Array<[string, number, string]> = [
    ['Utilisateurs', metrics.totalUsers, 'Comptes actuellement en base'],
    ['Reservations', metrics.totalReservations, 'Toutes les reservations enregistrees'],
    ['A venir', metrics.upcomingReservations, 'Rendez-vous futurs ou du jour'],
    ['En attente', metrics.pendingReservations, 'Reservations a confirmer'],
    ['Avis', metrics.totalReviews, 'Commentaires et notes clients'],
    ['Services', metrics.activeServices, 'Services visibles pour la reservation']
  ];

  root.innerHTML = items
    .map(
      ([label, value, hint]) => `
        <article class="metric-card">
          <p class="metric-label">${escapeHtml(label)}</p>
          <strong class="metric-value">${value}</strong>
          <p class="metric-hint">${escapeHtml(hint)}</p>
        </article>
      `
    )
    .join('');
}

function renderCardList<T>(
  selector: string,
  items: T[],
  emptyMessage: string,
  toMarkup: (item: T) => string
) {
  const root = getElement<HTMLElement>(selector);
  if (items.length === 0) {
    root.innerHTML = `<p class="empty-state">${escapeHtml(emptyMessage)}</p>`;
    return;
  }

  root.innerHTML = items.map(item => `<article class="stack-card">${toMarkup(item)}</article>`).join('');
}

function renderTable<T>(
  selector: string,
  rows: T[],
  emptyMessage: string,
  colspan: number,
  toMarkup: (row: T) => string
) {
  const root = getElement<HTMLElement>(selector);
  if (rows.length === 0) {
    root.innerHTML = `<tr><td colspan="${colspan}" class="empty-state">${escapeHtml(emptyMessage)}</td></tr>`;
    return;
  }

  root.innerHTML = rows.map(row => `<tr>${toMarkup(row)}</tr>`).join('');
}

function showLoginView(message?: string) {
  const loginView = getElement<HTMLElement>('#login-view');
  const dashboardView = getElement<HTMLElement>('#dashboard-view');
  const loginBanner = getElement<HTMLElement>('#login-banner');
  const dashboardBanner = getElement<HTMLElement>('#dashboard-banner');

  dashboardView.hidden = true;
  loginView.hidden = false;
  clearBanner(dashboardBanner);

  if (message) {
    setBanner(loginBanner, message, 'success');
    return;
  }

  clearBanner(loginBanner);
}

function showDashboardView() {
  getElement<HTMLElement>('#login-view').hidden = true;
  getElement<HTMLElement>('#dashboard-view').hidden = false;
  clearBanner(getElement<HTMLElement>('#login-banner'));
}

async function loadDashboard() {
  const dashboardBanner = getElement<HTMLElement>('#dashboard-banner');
  clearBanner(dashboardBanner);

  const [summary, users, reservations, services] = await Promise.all([
    apiRequest<AdminSummary>('/api/admin/summary'),
    apiRequest<AdminUser[]>('/api/admin/users'),
    apiRequest<AdminReservation[]>('/api/admin/reservations'),
    apiRequest<AdminService[]>('/api/admin/services')
  ]);

  getElement<HTMLElement>('#session-copy').textContent = session
    ? `Connecte en tant que ${session.user.fullName} (${session.user.email})`
    : 'Session admin inconnue';

  renderMetrics(summary.metrics);

  renderCardList(
    '#recent-reviews',
    summary.recentReviews,
    'Aucun avis recent.',
    review => `
      <strong>${escapeHtml(review.customerName)}</strong>
      <p class="muted-text">${escapeHtml(review.serviceLabel)} · ${review.rating}/5</p>
      <p>${escapeHtml(review.comment || 'Sans commentaire.')}</p>
      <p class="muted-text">${escapeHtml(formatDateTime(review.createdAt))}</p>
    `
  );

  renderCardList(
    '#recent-reservations',
    summary.recentReservations,
    'Aucune reservation recente.',
    reservation => `
      <strong>${escapeHtml(reservation.customerName)}</strong>
      <p class="muted-text">${escapeHtml(reservation.customerEmail)}</p>
      <p>${escapeHtml(reservation.serviceLabel)}</p>
      <p><span class="pill">${escapeHtml(reservation.status)}</span></p>
      <p class="muted-text">${escapeHtml(formatDateTime(reservation.scheduledAt))}</p>
    `
  );

  renderTable(
    '#services-table',
    services,
    'Aucun service disponible.',
    4,
    service => `
      <td>
        <strong>${escapeHtml(service.label)}</strong>
        <p class="muted-text">${escapeHtml(service.description || 'Sans description')}</p>
      </td>
      <td>${service.durationMinutes} min</td>
      <td>${escapeHtml(formatCurrency(service.price, 'CAD'))}</td>
      <td>${escapeHtml(service.slotTimes.join(', '))}</td>
    `
  );

  renderTable(
    '#users-table',
    users,
    'Aucun utilisateur.',
    4,
    user => `
      <td>
        <strong>${escapeHtml(user.fullName)}</strong>
        <p class="muted-text">${escapeHtml(user.email)}</p>
      </td>
      <td>${escapeHtml(user.role)}</td>
      <td>${user.vehicleCount} vehicules · ${user.reservationCount} reservations · ${user.reviewCount} avis</td>
      <td>${escapeHtml(formatDate(user.createdAt))}</td>
    `
  );

  renderTable(
    '#reservations-table',
    reservations,
    'Aucune reservation.',
    4,
    reservation => `
      <td>
        <strong>${escapeHtml(reservation.customerName)}</strong>
        <p class="muted-text">${escapeHtml(reservation.customerEmail)}</p>
      </td>
      <td>${escapeHtml(reservation.serviceLabel)}</td>
      <td><span class="pill">${escapeHtml(reservation.status)}</span></td>
      <td>${escapeHtml(formatDateTime(reservation.scheduledAt))}</td>
    `
  );
}

async function handleLoginSubmit(event: SubmitEvent) {
  event.preventDefault();
  const loginBanner = getElement<HTMLElement>('#login-banner');
  clearBanner(loginBanner);

  const form = event.currentTarget as HTMLFormElement;
  const formData = new FormData(form);

  try {
    const payload = await apiRequest<AuthSession>('/api/auth/login', {
      method: 'POST',
      body: {
        email: String(formData.get('email') || ''),
        password: String(formData.get('password') || '')
      },
      retryOnUnauthorized: false
    });

    if (payload.user.role !== 'ADMIN') {
      throw new Error('Ce compte n a pas les droits administrateur.');
    }

    saveSession(payload);
    showDashboardView();
    await loadDashboard();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connexion admin impossible.';
    setBanner(loginBanner, message, 'error');
  }
}

async function handleServiceSubmit(event: SubmitEvent) {
  event.preventDefault();
  const dashboardBanner = getElement<HTMLElement>('#dashboard-banner');
  clearBanner(dashboardBanner);

  const form = event.currentTarget as HTMLFormElement;
  const formData = new FormData(form);

  try {
    await apiRequest<AdminService>('/api/admin/services', {
      method: 'POST',
      body: {
        label: String(formData.get('label') || ''),
        slug: String(formData.get('slug') || ''),
        description: String(formData.get('description') || ''),
        durationMinutes: String(formData.get('durationMinutes') || ''),
        price: String(formData.get('price') || ''),
        slotTimes: String(formData.get('slotTimes') || '')
      }
    });

    form.reset();
    setBanner(dashboardBanner, 'Service ajoute avec succes.', 'success');
    await loadDashboard();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ajout du service impossible.';
    setBanner(dashboardBanner, message, 'error');
  }
}

function handleLogout() {
  saveSession(null);
  showLoginView('Session admin fermee.');
}

async function initApp() {
  createAppShell();

  getElement<HTMLFormElement>('#login-form').addEventListener('submit', event => {
    void handleLoginSubmit(event);
  });
  getElement<HTMLFormElement>('#service-form').addEventListener('submit', event => {
    void handleServiceSubmit(event);
  });
  getElement<HTMLButtonElement>('#refresh-button').addEventListener('click', () => {
    void loadDashboard().catch(error => {
      const message = error instanceof Error ? error.message : 'Rafraichissement impossible.';
      setBanner(getElement<HTMLElement>('#dashboard-banner'), message, 'error');
    });
  });
  getElement<HTMLButtonElement>('#logout-button').addEventListener('click', handleLogout);

  if (!session?.accessToken) {
    showLoginView();
    return;
  }

  showDashboardView();

  try {
    await loadDashboard();
  } catch (error) {
    saveSession(null);
    const message = error instanceof Error ? error.message : 'Session admin invalide.';
    showLoginView(message);
  }
}

void initApp();
