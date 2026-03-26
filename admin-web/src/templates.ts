import { DEFAULT_THUMBNAIL, escapeHtml, formatCurrency, formatDate, formatDateTime } from './helpers';
import type { AdminService, AdminSummary, DashboardData, TutorialItem, ViewKey } from './types';

export const VIEW_LABELS: Record<ViewKey, string> = {
  dashboard: 'Accueil',
  services: 'Services',
  tutorials: 'Tutoriels video',
  users: 'Utilisateurs',
  reservations: 'Reservations',
  reviews: 'Avis'
};

export function renderAppShell(apiUrl: string) {
  return `
    <main class="shell">
      <section class="hero">
        <div>
          <p class="eyebrow">Garage Mechanic</p>
          <h1>Console administrateur web</h1>
          <p class="hero-copy">
            Un front web separe pour piloter le garage, suivre les donnees utiles et gerer les services
            ainsi que les tutoriels video sans passer par l'application mobile.
          </p>
        </div>
        <div class="hero-note">
          <strong>API cible</strong>
          <span>${escapeHtml(apiUrl)}</span>
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
            <input id="login-email" name="email" type="email" autocomplete="email" placeholder="admin@example.com" required />
          </label>
          <label>
            Mot de passe
            <input id="login-password" name="password" type="password" autocomplete="current-password" placeholder="Mot de passe" required />
          </label>
          <div class="form-actions">
            <button type="submit">Se connecter</button>
          </div>
        </form>
        <p id="login-banner" class="banner" hidden></p>
      </section>

      <section id="dashboard-view" hidden></section>
    </main>
  `;
}

function renderQuickList<T>(
  items: T[],
  emptyMessage: string,
  renderer: (item: T) => string
) {
  if (items.length === 0) {
    return `<p class="empty-state">${escapeHtml(emptyMessage)}</p>`;
  }

  return items.map(item => `<article class="stack-card">${renderer(item)}</article>`).join('');
}

function renderMetricCards(summary: AdminSummary) {
  const items: Array<{ label: string; value: number; hint: string; view: ViewKey }> = [
    { label: 'Utilisateurs', value: summary.metrics.totalUsers, hint: 'Voir les comptes et les roles', view: 'users' },
    { label: 'Reservations', value: summary.metrics.totalReservations, hint: 'Consulter toutes les reservations', view: 'reservations' },
    { label: 'A venir', value: summary.metrics.upcomingReservations, hint: 'Acceder aux rendez-vous planifies', view: 'reservations' },
    { label: 'En attente', value: summary.metrics.pendingReservations, hint: 'Surveiller les demandes a traiter', view: 'reservations' },
    { label: 'Avis', value: summary.metrics.totalReviews, hint: 'Lire les derniers retours clients', view: 'reviews' },
    { label: 'Services', value: summary.metrics.activeServices, hint: 'Gerer le catalogue de services', view: 'services' }
  ];

  return items
    .map(
      item => `
        <button type="button" class="metric-card metric-action" data-view="${item.view}">
          <p class="metric-label">${escapeHtml(item.label)}</p>
          <strong class="metric-value">${item.value}</strong>
          <p class="metric-hint">${escapeHtml(item.hint)}</p>
        </button>
      `
    )
    .join('');
}

function renderDashboardSection(summary: AdminSummary) {
  return `
    <section class="content-grid">
      <article class="panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">Activite</p>
            <h3>Reservations recentes</h3>
          </div>
        </div>
        <div class="stack-list">
          ${renderQuickList(
            summary.recentReservations,
            'Aucune reservation recente.',
            reservation => `
              <strong>${escapeHtml(reservation.customerName)}</strong>
              <p class="muted-text">${escapeHtml(reservation.customerEmail)}</p>
              <p>${escapeHtml(reservation.serviceLabel)}</p>
              <p class="muted-text">${escapeHtml(formatDateTime(reservation.scheduledAt))}</p>
            `
          )}
        </div>
      </article>

      <article class="panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">Qualite</p>
            <h3>Avis recents</h3>
          </div>
        </div>
        <div class="stack-list">
          ${renderQuickList(
            summary.recentReviews,
            'Aucun avis recent.',
            review => `
              <strong>${escapeHtml(review.customerName)}</strong>
              <p class="muted-text">${escapeHtml(review.serviceLabel)} - ${review.rating}/5</p>
              <p>${escapeHtml(review.comment || 'Sans commentaire.')}</p>
              <p class="muted-text">${escapeHtml(formatDateTime(review.createdAt))}</p>
            `
          )}
        </div>
      </article>
    </section>
  `;
}

function renderServiceCards(services: AdminService[], selectedService: AdminService | null) {
  if (services.length === 0) {
    return '<p class="empty-state">Aucun service disponible.</p>';
  }

  return services
    .map(
      service => `
        <button
          type="button"
          class="entity-card service-card ${service.id === selectedService?.id ? 'is-active' : ''}"
          data-service-id="${service.id}"
        >
          <span class="entity-kicker">${escapeHtml(service.slug)}</span>
          <strong>${escapeHtml(service.label)}</strong>
          <p>${escapeHtml(service.description || 'Sans description.')}</p>
          <div class="entity-meta">
            <span>${service.durationMinutes} min</span>
            <span>${escapeHtml(formatCurrency(service.price, 'CAD'))}</span>
          </div>
        </button>
      `
    )
    .join('');
}

function renderServiceSection(data: DashboardData, selectedServiceId: string | null) {
  const selectedService =
    data.services.find(service => service.id === selectedServiceId) ?? data.services[0] ?? null;

  return `
    <section class="content-grid service-layout">
      <article class="panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">Catalogue</p>
            <h3>Services disponibles</h3>
            <p>Les cartes sont cliquables pour afficher le detail du service.</p>
          </div>
        </div>
        <div class="card-grid">
          ${renderServiceCards(data.services, selectedService)}
        </div>
      </article>

      <article class="panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">Detail</p>
            <h3>${escapeHtml(selectedService?.label || 'Selectionne un service')}</h3>
          </div>
        </div>
        ${
          selectedService
            ? `
              <div class="detail-card">
                <p class="detail-copy">${escapeHtml(selectedService.description || 'Sans description detaillee.')}</p>
                <dl class="detail-grid">
                  <div><dt>Identifiant</dt><dd>${escapeHtml(selectedService.slug)}</dd></div>
                  <div><dt>Prix</dt><dd>${escapeHtml(formatCurrency(selectedService.price, 'CAD'))}</dd></div>
                  <div><dt>Duree</dt><dd>${selectedService.durationMinutes} minutes</dd></div>
                  <div><dt>Horaires</dt><dd>${escapeHtml(selectedService.slotTimes.join(', '))}</dd></div>
                </dl>
              </div>
            `
            : '<p class="empty-state">Selectionne un service pour voir son detail.</p>'
        }

        <div class="form-block">
          <div class="panel-heading compact">
            <div>
              <p class="section-kicker">Creation</p>
              <h3>Ajouter un nouveau service</h3>
            </div>
          </div>
          <form id="service-form" class="form-grid">
            <label><span>Libelle</span><input name="label" type="text" placeholder="Entretien climatisation" required /></label>
            <label><span>Slug optionnel</span><input name="slug" type="text" placeholder="entretien-climatisation" /></label>
            <label class="field-span-2"><span>Description</span><textarea name="description" placeholder="Description courte du service"></textarea></label>
            <label><span>Duree (minutes)</span><input name="durationMinutes" type="number" min="1" step="1" placeholder="60" required /></label>
            <label><span>Prix (CAD)</span><input name="price" type="number" min="0.01" step="0.01" placeholder="89.99" required /></label>
            <label class="field-span-2"><span>Horaires</span><input name="slotTimes" type="text" placeholder="09:00, 11:00, 14:00, 16:00" required /></label>
            <div class="form-actions"><button type="submit">Ajouter le service</button></div>
          </form>
        </div>
      </article>
    </section>
  `;
}

function renderTutorialCards(tutorials: TutorialItem[], selectedTutorial: TutorialItem | null) {
  if (tutorials.length === 0) {
    return '<p class="empty-state">Aucun tutoriel disponible.</p>';
  }

  return tutorials
    .map(
      tutorial => `
        <button
          type="button"
          class="entity-card tutorial-card ${tutorial.id === selectedTutorial?.id ? 'is-active' : ''}"
          data-tutorial-id="${tutorial.id}"
        >
          <span class="entity-kicker">${escapeHtml(tutorial.category)}</span>
          <strong>${escapeHtml(tutorial.title)}</strong>
          <p>${escapeHtml(tutorial.description)}</p>
          <div class="entity-meta">
            <span>${tutorial.duration} min</span>
            <span>${tutorial.rating.toFixed(1)}/5</span>
          </div>
        </button>
      `
    )
    .join('');
}

function renderTutorialsSection(data: DashboardData, selectedTutorialId: string | null) {
  const selectedTutorial =
    data.tutorials.find(tutorial => tutorial.id === selectedTutorialId) ?? data.tutorials[0] ?? null;

  return `
    <section class="content-grid tutorial-layout">
      <article class="panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">Bibliotheque</p>
            <h3>Tutoriels video</h3>
            <p>Ajoute et consulte les contenus video visibles dans l'application.</p>
          </div>
        </div>
        <div class="card-grid">
          ${renderTutorialCards(data.tutorials, selectedTutorial)}
        </div>
      </article>

      <article class="panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">Detail</p>
            <h3>${escapeHtml(selectedTutorial?.title || 'Selectionne un tutoriel')}</h3>
          </div>
          ${
            selectedTutorial
              ? `<a class="link-chip" href="${escapeHtml(selectedTutorial.videoUrl)}" target="_blank" rel="noreferrer">Ouvrir la video</a>`
              : ''
          }
        </div>
        ${
          selectedTutorial
            ? `
              <div class="detail-card">
                <div class="media-block">
                  <img src="${escapeHtml(selectedTutorial.thumbnail || DEFAULT_THUMBNAIL)}" alt="${escapeHtml(selectedTutorial.title)}" />
                </div>
                <p class="detail-copy">${escapeHtml(selectedTutorial.description)}</p>
                <dl class="detail-grid">
                  <div><dt>Categorie</dt><dd>${escapeHtml(selectedTutorial.category)}</dd></div>
                  <div><dt>Difficulte</dt><dd>${escapeHtml(selectedTutorial.difficulty)}</dd></div>
                  <div><dt>Duree</dt><dd>${selectedTutorial.duration} minutes</dd></div>
                  <div><dt>Vues</dt><dd>${selectedTutorial.views}</dd></div>
                </dl>
                <div class="list-block">
                  <strong>Instructions</strong>
                  <ul>
                    ${
                      selectedTutorial.instructions.length === 0
                        ? '<li>Aucune instruction.</li>'
                        : selectedTutorial.instructions.map(item => `<li>${escapeHtml(item)}</li>`).join('')
                    }
                  </ul>
                </div>
                <div class="list-block">
                  <strong>Outils</strong>
                  <ul>
                    ${
                      selectedTutorial.tools.length === 0
                        ? '<li>Aucun outil specifie.</li>'
                        : selectedTutorial.tools.map(item => `<li>${escapeHtml(item)}</li>`).join('')
                    }
                  </ul>
                </div>
              </div>
            `
            : '<p class="empty-state">Selectionne un tutoriel pour voir son detail.</p>'
        }

        <div class="form-block">
          <div class="panel-heading compact">
            <div>
              <p class="section-kicker">Creation</p>
              <h3>Ajouter un tutoriel video</h3>
            </div>
          </div>
          <form id="tutorial-form" class="form-grid">
            <label class="field-span-2"><span>Titre</span><input name="title" type="text" placeholder="Verifier le niveau d'huile" required /></label>
            <label class="field-span-2"><span>Description</span><textarea name="description" placeholder="Description du tutoriel" required></textarea></label>
            <label>
              <span>Categorie</span>
              <select name="category">
                <option value="entretien">Entretien</option>
                <option value="freins">Freins</option>
                <option value="suspension">Suspension</option>
                <option value="batterie">Batterie</option>
                <option value="diagnostic">Diagnostic</option>
                <option value="eclairage">Eclairage</option>
                <option value="fluide">Fluide</option>
                <option value="mecanique">Mecanique</option>
              </select>
            </label>
            <label>
              <span>Difficulte</span>
              <select name="difficulty">
                <option value="facile">Facile</option>
                <option value="moyen">Moyen</option>
                <option value="difficile">Difficile</option>
              </select>
            </label>
            <label><span>Duree (minutes)</span><input name="duration" type="number" min="1" step="1" placeholder="12" required /></label>
            <label><span>URL video</span><input name="videoUrl" type="url" placeholder="https://..." required /></label>
            <label class="field-span-2"><span>URL miniature</span><input name="thumbnail" type="url" placeholder="https://..." /></label>
            <label class="field-span-2"><span>Instructions</span><textarea name="instructions" placeholder="Une instruction par ligne" required></textarea></label>
            <label class="field-span-2"><span>Outils</span><textarea name="tools" placeholder="Liste separee par ligne ou virgule"></textarea></label>
            <div class="form-actions"><button type="submit">Ajouter le tutoriel</button></div>
          </form>
        </div>
      </article>
    </section>
  `;
}

function renderUsersSection(data: DashboardData) {
  return `
    <section class="content-grid single-column">
      <article class="panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">Clients et equipe</p>
            <h3>Utilisateurs</h3>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Utilisateur</th><th>Role</th><th>Activite</th><th>Creation</th></tr>
            </thead>
            <tbody>
              ${
                data.users.length === 0
                  ? '<tr><td colspan="4" class="empty-state">Aucun utilisateur.</td></tr>'
                  : data.users
                      .map(
                        user => `
                          <tr>
                            <td><strong>${escapeHtml(user.fullName)}</strong><p class="muted-text">${escapeHtml(user.email)}</p></td>
                            <td>${escapeHtml(user.role)}</td>
                            <td>${user.vehicleCount} vehicules - ${user.reservationCount} reservations - ${user.reviewCount} avis</td>
                            <td>${escapeHtml(formatDate(user.createdAt))}</td>
                          </tr>
                        `
                      )
                      .join('')
              }
            </tbody>
          </table>
        </div>
      </article>
    </section>
  `;
}

function renderReservationsSection(data: DashboardData) {
  return `
    <section class="content-grid single-column">
      <article class="panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">Planning</p>
            <h3>Reservations</h3>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Client</th><th>Service</th><th>Statut</th><th>Planifie</th><th>Montant</th></tr>
            </thead>
            <tbody>
              ${
                data.reservations.length === 0
                  ? '<tr><td colspan="5" class="empty-state">Aucune reservation.</td></tr>'
                  : data.reservations
                      .map(
                        reservation => `
                          <tr>
                            <td><strong>${escapeHtml(reservation.customerName)}</strong><p class="muted-text">${escapeHtml(reservation.customerEmail)}</p></td>
                            <td>${escapeHtml(reservation.serviceLabel)}</td>
                            <td><span class="pill">${escapeHtml(reservation.status)}</span></td>
                            <td>${escapeHtml(formatDateTime(reservation.scheduledAt))}</td>
                            <td>${escapeHtml(formatCurrency(reservation.amount, reservation.currency))}</td>
                          </tr>
                        `
                      )
                      .join('')
              }
            </tbody>
          </table>
        </div>
      </article>
    </section>
  `;
}

function renderReviewsSection(summary: AdminSummary) {
  return `
    <section class="content-grid single-column">
      <article class="panel">
        <div class="panel-heading">
          <div>
            <p class="section-kicker">Qualite</p>
            <h3>Derniers avis</h3>
          </div>
        </div>
        <div class="stack-list">
          ${renderQuickList(
            summary.recentReviews,
            'Aucun avis recent.',
            review => `
              <strong>${escapeHtml(review.customerName)}</strong>
              <p class="muted-text">${escapeHtml(review.serviceLabel)} - ${review.rating}/5</p>
              <p>${escapeHtml(review.comment || 'Sans commentaire.')}</p>
              <p class="muted-text">${escapeHtml(formatDateTime(review.createdAt))}</p>
            `
          )}
        </div>
      </article>
    </section>
  `;
}

function renderActiveSection(data: DashboardData, currentView: ViewKey, selectedServiceId: string | null, selectedTutorialId: string | null) {
  switch (currentView) {
    case 'services':
      return renderServiceSection(data, selectedServiceId);
    case 'tutorials':
      return renderTutorialsSection(data, selectedTutorialId);
    case 'users':
      return renderUsersSection(data);
    case 'reservations':
      return renderReservationsSection(data);
    case 'reviews':
      return renderReviewsSection(data.summary);
    case 'dashboard':
    default:
      return renderDashboardSection(data.summary);
  }
}

export function renderDashboardPage(args: {
  currentView: ViewKey;
  data: DashboardData;
  selectedServiceId: string | null;
  selectedTutorialId: string | null;
  sessionName: string;
  sessionEmail: string;
}) {
  const { currentView, data, selectedServiceId, selectedTutorialId, sessionName, sessionEmail } = args;

  return `
    <div class="dashboard-toolbar">
      <div>
        <p class="section-kicker">Pilotage</p>
        <h2>${escapeHtml(VIEW_LABELS[currentView])}</h2>
        <p id="session-copy" class="muted-text">Connecte en tant que ${escapeHtml(sessionName)} (${escapeHtml(sessionEmail)})</p>
      </div>
      <div class="toolbar-actions">
        <button id="refresh-button" type="button" class="button-secondary">Rafraichir</button>
        <button id="logout-button" type="button" class="button-ghost">Se deconnecter</button>
      </div>
    </div>

    <nav class="view-nav">
      ${(
        Object.keys(VIEW_LABELS) as ViewKey[]
      )
        .map(
          view => `
            <button type="button" class="nav-chip ${view === currentView ? 'is-active' : ''}" data-view="${view}">
              ${escapeHtml(VIEW_LABELS[view])}
            </button>
          `
        )
        .join('')}
    </nav>

    <p id="dashboard-banner" class="banner" hidden></p>

    ${
      currentView === 'dashboard'
        ? `
          <section class="metrics-grid">
            ${renderMetricCards(data.summary)}
          </section>
        `
        : ''
    }

    ${renderActiveSection(data, currentView, selectedServiceId, selectedTutorialId)}
  `;
}
