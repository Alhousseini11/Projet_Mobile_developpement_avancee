import { API_URL, apiMultipartRequest, apiRequest, getSession, saveSession } from './api';
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

type ServiceEditorMode = 'create' | 'edit';

let currentView: ViewKey = 'dashboard';
let dashboardData: DashboardData | null = null;
let selectedServiceId: string | null = null;
let selectedTutorialId: string | null = null;
let serviceEditorMode: ServiceEditorMode = 'edit';

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

  if (dashboardData.services.length === 0) {
    selectedServiceId = null;
    serviceEditorMode = 'create';
  } else if (serviceEditorMode === 'edit') {
    const selectedStillExists = selectedServiceId
      ? dashboardData.services.some(service => service.id === selectedServiceId)
      : false;

    if (!selectedStillExists) {
      selectedServiceId = dashboardData.services[0].id;
    }
  }

  const selectedTutorialStillExists = selectedTutorialId
    ? dashboardData.tutorials.some(tutorial => tutorial.id === selectedTutorialId)
    : false;

  if (!selectedTutorialStillExists) {
    selectedTutorialId = dashboardData.tutorials[0]?.id ?? null;
  }
}

function getDashboardBanner() {
  return getElement<HTMLElement>('#dashboard-banner');
}

async function loadDashboardData() {
  const [summary, users, reservations, services, tutorials] = await Promise.all([
    apiRequest<AdminSummary>('/api/admin/summary'),
    apiRequest<AdminUser[]>('/api/admin/users'),
    apiRequest<AdminReservation[]>('/api/admin/reservations'),
    apiRequest<AdminService[]>('/api/admin/services'),
    apiRequest<TutorialItem[]>('/api/admin/tutorials')
  ]);

  dashboardData = {
    summary,
    users,
    reservations,
    services,
    tutorials
  };
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
    serviceEditorMode,
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

function enterCreateServiceMode() {
  serviceEditorMode = 'create';
  selectedServiceId = null;
  renderDashboard();
}

function selectService(serviceId: string | null) {
  selectedServiceId = serviceId;
  serviceEditorMode = serviceId ? 'edit' : 'create';
  renderDashboard();
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
  const formData = new FormData(form);
  const payload = {
    label: String(formData.get('label') || ''),
    slug: String(formData.get('slug') || ''),
    description: String(formData.get('description') || ''),
    durationMinutes: String(formData.get('durationMinutes') || ''),
    price: String(formData.get('price') || ''),
    slotTimes: String(formData.get('slotTimes') || '')
  };

  try {
    if (serviceEditorMode === 'edit' && selectedServiceId) {
      const updated = await apiRequest<AdminService>(`/api/admin/services/${selectedServiceId}`, {
        method: 'PUT',
        body: payload
      });

      selectedServiceId = updated.id;
      serviceEditorMode = 'edit';
      currentView = 'services';
      await refreshDashboard('Service modifie avec succes.');
      return;
    }

    const created = await apiRequest<AdminService>('/api/admin/services', {
      method: 'POST',
      body: payload
    });

    selectedServiceId = created.id;
    serviceEditorMode = 'edit';
    currentView = 'services';
    await refreshDashboard('Service ajoute avec succes.');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Operation sur le service impossible.';
    setBanner(getDashboardBanner(), message, 'error');
  }
}

async function handleDeleteService(serviceId: string) {
  const confirmed = window.confirm('Archiver ce service et le retirer du catalogue public ?');
  if (!confirmed) {
    return;
  }

  try {
    await apiRequest<AdminService>(`/api/admin/services/${serviceId}`, {
      method: 'DELETE'
    });

    selectedServiceId = null;
    serviceEditorMode = 'create';
    currentView = 'services';
    await refreshDashboard('Service archive avec succes.');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Archivage du service impossible.';
    setBanner(getDashboardBanner(), message, 'error');
  }
}

async function handleTutorialSubmit(event: SubmitEvent) {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const formData = new FormData(form);
  const file = formData.get('videoFile');

  if (!(file instanceof File) || file.size === 0) {
    setBanner(getDashboardBanner(), 'Choisis un fichier video a televerser.', 'error');
    return;
  }

  try {
    const instructions = splitStringList(String(formData.get('instructions') || ''));
    if (instructions.length === 0) {
      throw new Error('Au moins une instruction est requise.');
    }

    const payload = new FormData();
    payload.set('title', String(formData.get('title') || ''));
    payload.set('description', String(formData.get('description') || ''));
    payload.set('category', String(formData.get('category') || 'entretien'));
    payload.set('difficulty', String(formData.get('difficulty') || 'facile'));
    payload.set('duration', String(formData.get('duration') || '0'));
    payload.set('thumbnail', String(formData.get('thumbnail') || '') || DEFAULT_THUMBNAIL);
    payload.set('instructions', instructions.join('\n'));
    payload.set('tools', splitStringList(String(formData.get('tools') || '')).join('\n'));
    payload.set('videoFile', file);

    const tutorial = await apiMultipartRequest<TutorialItem>('/api/admin/tutorials', payload, {
      method: 'POST'
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
  serviceEditorMode = 'edit';
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
      selectService(button.dataset.serviceId ?? null);
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-service-new]').forEach(button => {
    button.addEventListener('click', enterCreateServiceMode);
  });

  document.querySelectorAll<HTMLButtonElement>('[data-service-delete]').forEach(button => {
    button.addEventListener('click', () => {
      const serviceId = button.dataset.serviceDelete;
      if (serviceId) {
        void handleDeleteService(serviceId);
      }
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
