import { API_URL, apiRequest, getSession, saveSession } from './api';
import { DEFAULT_THUMBNAIL, splitStringList } from './helpers';
import { renderAppShell, renderDashboardPage } from './templates';
import type {
  AdminService,
  AdminSummary,
  AdminUser,
  AdminReservation,
  AuthSession,
  DashboardData,
  TutorialItem,
  ViewKey
} from './types';

let currentView: ViewKey = 'dashboard';
let dashboardData: DashboardData | null = null;
let selectedServiceId: string | null = null;
let selectedTutorialId: string | null = null;

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

function showLoginView(message?: string) {
  getElement<HTMLElement>('#dashboard-view').hidden = true;
  getElement<HTMLElement>('#login-view').hidden = false;

  const banner = getElement<HTMLElement>('#login-banner');
  if (message) {
    setBanner(banner, message, 'success');
    return;
  }

  clearBanner(banner);
}

function showDashboardView() {
  getElement<HTMLElement>('#login-view').hidden = true;
  getElement<HTMLElement>('#dashboard-view').hidden = false;
  clearBanner(getElement<HTMLElement>('#login-banner'));
}

function ensureSelections() {
  if (!dashboardData) {
    return;
  }

  if (!selectedServiceId && dashboardData.services.length > 0) {
    selectedServiceId = dashboardData.services[0].id;
  }

  if (!selectedTutorialId && dashboardData.tutorials.length > 0) {
    selectedTutorialId = dashboardData.tutorials[0].id;
  }
}

async function loadDashboardData() {
  const [summary, users, reservations, services, tutorials] = await Promise.all([
    apiRequest<AdminSummary>('/api/admin/summary'),
    apiRequest<AdminUser[]>('/api/admin/users'),
    apiRequest<AdminReservation[]>('/api/admin/reservations'),
    apiRequest<AdminService[]>('/api/admin/services'),
    apiRequest<TutorialItem[]>('/api/tutorials')
  ]);

  dashboardData = {
    summary,
    users,
    reservations,
    services,
    tutorials
  };
}

function getDashboardBanner() {
  return getElement<HTMLElement>('#dashboard-banner');
}

function renderDashboard() {
  const session = getSession();
  if (!session || !dashboardData) {
    return;
  }

  ensureSelections();

  const dashboardView = getElement<HTMLElement>('#dashboard-view');
  dashboardView.innerHTML = renderDashboardPage({
    currentView,
    data: dashboardData,
    selectedServiceId,
    selectedTutorialId,
    sessionName: session.user.fullName,
    sessionEmail: session.user.email
  });

  bindDashboardListeners();
}

async function refreshDashboard(successMessage?: string) {
  try {
    await loadDashboardData();
    showDashboardView();
    renderDashboard();

    if (successMessage) {
      setBanner(getDashboardBanner(), successMessage, 'success');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Chargement admin impossible.';
    showLoginView(message);
  }
}

async function handleLoginSubmit(event: SubmitEvent) {
  event.preventDefault();
  const banner = getElement<HTMLElement>('#login-banner');
  clearBanner(banner);

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
    currentView = 'dashboard';
    await refreshDashboard();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connexion admin impossible.';
    setBanner(banner, message, 'error');
  }
}

async function handleServiceSubmit(event: SubmitEvent) {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;

  try {
    const formData = new FormData(form);
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
    currentView = 'services';
    await refreshDashboard('Service ajoute avec succes.');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ajout du service impossible.';
    setBanner(getDashboardBanner(), message, 'error');
  }
}

async function handleTutorialSubmit(event: SubmitEvent) {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;

  try {
    const formData = new FormData(form);
    const instructions = splitStringList(String(formData.get('instructions') || ''));

    if (instructions.length === 0) {
      throw new Error('Au moins une instruction est requise.');
    }

    const tutorial = await apiRequest<TutorialItem>('/api/tutorials', {
      method: 'POST',
      body: {
        title: String(formData.get('title') || ''),
        description: String(formData.get('description') || ''),
        category: String(formData.get('category') || 'entretien'),
        difficulty: String(formData.get('difficulty') || 'facile'),
        duration: Number(formData.get('duration') || 0),
        thumbnail: String(formData.get('thumbnail') || '') || DEFAULT_THUMBNAIL,
        videoUrl: String(formData.get('videoUrl') || ''),
        instructions,
        tools: splitStringList(String(formData.get('tools') || '')),
        views: 0,
        rating: 0
      }
    });

    selectedTutorialId = tutorial.id;
    form.reset();
    currentView = 'tutorials';
    await refreshDashboard('Tutoriel video ajoute avec succes.');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ajout du tutoriel impossible.';
    setBanner(getDashboardBanner(), message, 'error');
  }
}

function handleLogout() {
  saveSession(null);
  dashboardData = null;
  selectedServiceId = null;
  selectedTutorialId = null;
  currentView = 'dashboard';
  showLoginView('Session admin fermee.');
}

function bindDashboardListeners() {
  getElement<HTMLButtonElement>('#refresh-button').addEventListener('click', () => {
    void refreshDashboard();
  });

  getElement<HTMLButtonElement>('#logout-button').addEventListener('click', handleLogout);

  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => {
    button.addEventListener('click', () => {
      currentView = button.dataset.view as ViewKey;
      renderDashboard();
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-service-id]').forEach(button => {
    button.addEventListener('click', () => {
      selectedServiceId = button.dataset.serviceId ?? null;
      renderDashboard();
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-tutorial-id]').forEach(button => {
    button.addEventListener('click', () => {
      selectedTutorialId = button.dataset.tutorialId ?? null;
      renderDashboard();
    });
  });

  document.querySelector<HTMLFormElement>('#service-form')?.addEventListener('submit', event => {
    void handleServiceSubmit(event);
  });

  document.querySelector<HTMLFormElement>('#tutorial-form')?.addEventListener('submit', event => {
    void handleTutorialSubmit(event);
  });
}

export async function initAdminApp() {
  const root = document.querySelector<HTMLDivElement>('#app');
  if (!root) {
    throw new Error('Admin root introuvable.');
  }

  root.innerHTML = renderAppShell(API_URL);
  getElement<HTMLFormElement>('#login-form').addEventListener('submit', event => {
    void handleLoginSubmit(event);
  });

  const session = getSession();
  if (!session?.accessToken) {
    showLoginView();
    return;
  }

  try {
    await refreshDashboard();
  } catch (error) {
    saveSession(null);
    const message = error instanceof Error ? error.message : 'Session admin invalide.';
    showLoginView(message);
  }
}
