# 🚀 Garage Mechanic

**Application mobile full-stack pour la gestion automobile, connectée à une API REST sécurisée et déployable sur VPS.**

`NativeScript + Vue` · `Node.js + Express + TypeScript` · `Prisma + PostgreSQL` · `Docker + Nginx + VPS`

---

## 🎯 Présentation du projet

Garage Mechanic est une application mobile conçue pour digitaliser l’expérience client d’un garage automobile.

L’objectif est simple : permettre à un utilisateur de gérer ses véhicules, réserver des services, suivre ses rendez-vous, consulter des tutoriels et accéder à son espace client depuis une application mobile.

Le projet a été construit comme un **vrai projet full-stack** :

- une application mobile NativeScript/Vue ;
- une API REST TypeScript structurée par modules ;
- une base PostgreSQL versionnée avec Prisma ;
- une stack Docker prête pour un déploiement VPS ;
- des contrôles de sécurité, de configuration et de santé applicative.

---

## ✨ Fonctionnalités principales

- Création de compte, connexion et authentification JWT.
- Gestion du profil client et des informations personnelles.
- Ajout, modification et suivi des véhicules.
- Réservation de services garage avec suivi de statut.
- Consultation de tutoriels mécaniques avec catégories, vues et notes.
- Gestion des notifications utilisateur.
- Espace admin pour gérer les contenus et les données métier.
- Upload de médias pour certains contenus.
- Endpoint `/health` pour vérifier l’état de l’API et de PostgreSQL.
- API REST modulaire : `auth`, `vehicles`, `reservations`, `profile`, `tutorials`, `admin`, etc.

---

## 🧱 Architecture du projet

```text
Projet_Mobile_developpement_avancee/
|-- frontend/                 # Application mobile NativeScript + Vue
|   |-- app/
|   |   |-- components/       # Ecrans et composants mobiles
|   |   |-- services/         # Services API frontend
|   |   `-- utils/            # Client HTTP, auth, navigation
|   `-- scripts/              # Lancement par environnement
|
|-- admin-web/                # Interface web d'administration (Vite + TypeScript)
|   |-- src/                  # Pages, client API, session admin
|   `-- Dockerfile            # Build de production servi via Nginx
|
|-- backend/                  # API REST Node.js + Express + TypeScript
|   |-- src/
|   |   |-- core/             # App HTTP, middlewares, healthcheck
|   |   |-- config/           # Environnement, logger
|   |   |-- data/             # Prisma, DB, intégrations externes
|   |   |-- modules/          # Modules métier
|   |   `-- shared/           # Erreurs et utilitaires communs
|   |-- prisma/               # Schema, migrations, seed
|   `-- tests/                # Tests backend
|
|-- deploy/nginx/             # Reverse proxy Nginx
|-- docker-compose.yml        # Stack locale
|-- docker-compose.prod.yml   # Stack production
`-- .github/workflows/        # CI/CD GitHub Actions
```

---

## 🛠️ Technologies utilisées

### Frontend

- NativeScript
- Vue / NativeScript Vue
- TypeScript
- TailwindCSS
- Client API centralisé avec timeout, retry GET et gestion du token JWT

### Backend

- Node.js
- Express
- TypeScript
- Prisma ORM
- JWT
- Pino logger
- Architecture modulaire par domaine métier

### Base de données

- PostgreSQL 16
- Prisma Client
- Prisma Migrate
- Migrations versionnées
- Vérification de compatibilité schema/base au démarrage

### DevOps

- Docker
- Docker Compose
- Nginx reverse proxy
- VPS Ubuntu
- GitHub Actions
- Healthchecks Docker et endpoint `/health`

---

## ⚙️ Installation locale

### Prérequis

- Node.js 20+
- npm
- Docker Desktop
- NativeScript CLI
- Android Studio ou un émulateur Android

### 1. Cloner le projet

```bash
git clone https://github.com/Alhousseini11/Projet_Mobile_developpement_avancee.git
cd Projet_Mobile_developpement_avancee
```

### 2. Préparer les fichiers d’environnement

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

Sous PowerShell :

```powershell
Copy-Item .env.example .env
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.local.example frontend/.env.local
```

### 3. Démarrer PostgreSQL

```bash
docker compose up -d postgres
```

### 4. Lancer le backend

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate:dev
npm run dev
```

API locale :

```text
http://localhost:3000
http://localhost:3000/health
```

### 5. Lancer l’application mobile

```bash
cd frontend
npm install
npm run android:local
```

Pour l’émulateur Android :

```env
NS_API_BASE_URL=http://10.0.2.2:3000/api
```

---

## 🐳 Lancer avec Docker

La stack Docker locale lance PostgreSQL et le backend.

```bash
cp .env.example .env
cp backend/.env.example backend/.env
docker compose up --build
```

Services disponibles :

- API : `http://localhost:3000`
- Healthcheck : `http://localhost:3000/health`
- PostgreSQL : `localhost:5433`

Commandes utiles :

```bash
docker compose ps
docker compose logs -f backend
docker compose down
```

---

## 🔐 Configuration importante

Le projet utilise une configuration explicite par environnement. Aucun fallback implicite vers un serveur externe n’est utilisé.

### Variables racine Docker

```env
POSTGRES_DB=mon_app
POSTGRES_USER=mon_user
POSTGRES_PASSWORD=change-me
DATABASE_URL=postgresql://mon_user:change-me@postgres:5432/mon_app?schema=public
```

Fichiers et variables à connaître :

- `./.env` : variables Docker Compose locales (`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL` vers `postgres:5432`).
- `./.env.prod` : variables Docker Compose de production, y compris `ADMIN_WEB_API_URL` pour builder `admin-web`.
- `backend/.env` : variables backend pour `npm run dev` et `npm test` (`DATABASE_URL` vers `localhost:5433`, `JWT_SECRET`, puis les intégrations optionnelles).
- `DEMO_MODE` est désactivé par défaut. Active-le explicitement en local seulement si tu veux exposer le compte de démo.
- `CORS_ALLOWED_ORIGINS` : liste séparée par des virgules des origines navigateur autorisées. En production, renseigne-la explicitement pour l’admin web ou tout autre client navigateur.
- `TRUST_PROXY` : mettre `1` si le backend est derrière Nginx ou un load balancer afin d’utiliser la vraie IP client pour les logs et le rate limit.
- `HTTP_JSON_LIMIT` : taille max acceptée pour les payloads JSON et formulaires URL-encoded.
- `AUTH_RATE_LIMIT_*` : garde-fous minimaux sur `register`, `login`, `forgot-password`, `reset-password` et le formulaire HTML de reset. Actifs par défaut en production, désactivés par défaut en local.

### Variables backend essentielles

```env
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=replace-with-long-random-secret
DEMO_MODE=false
PUBLIC_BASE_URL=https://api.example.com
```

### Variables frontend essentielles

```env
NS_API_BASE_URL=http://10.0.2.2:3000/api
```

Scripts frontend par environnement :

```bash
npm run android:local
npm run android:shared-vps
npm run build:android:prod
```

---

## 🚀 Déploiement

Le projet est prévu pour être déployé sur un **VPS Ubuntu** avec Docker Compose.

Stack production :

- PostgreSQL en conteneur ;
- backend Node.js en conteneur ;
- admin web buildé en statique et exposé sur un sous-domaine dédié ;
- Nginx comme reverse proxy ;
- certificats TLS montés dans `deploy/certs/` ;
- healthcheck backend avant exposition par Nginx.

Commande de déploiement :

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

Vérification production :

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f backend
curl https://api.example.com/health
```

Le dépôt contient aussi un workflow GitHub Actions pour déployer sur VPS via SSH après validation de la CI.

---

## 🛡️ Sécurité & bonnes pratiques

- Authentification JWT centralisée côté backend.
- Guards Express pour protéger les routes privées.
- Contrôle de rôle pour les routes admin.
- `JWT_SECRET` obligatoire en production.
- `DATABASE_URL` obligatoire en production.
- `DEMO_MODE` bloqué en production.
- Secrets exclus du Dockerfile et injectés uniquement au runtime.
- Validation des variables critiques au démarrage du backend.
- Prisma Migrate pour éviter le drift entre code et base de données.
- Endpoint `/health` avec vérification PostgreSQL.
- Nginx utilisé comme reverse proxy TLS.
- Base prête pour du rate limiting sur les routes sensibles ou au niveau Nginx.
- CI GitHub Actions avec build, tests, coverage et validation Prisma.

---

## 👤 Ma contribution

J’ai travaillé sur la fiabilisation du projet pour le rapprocher d’un niveau production.

Mes contributions principales :

- Correction du drift Prisma et fiabilisation des migrations.
- Ajout d’un contrôle de compatibilité base de données au démarrage.
- Nettoyage de la configuration backend pour la production.
- Suppression des secrets du Dockerfile.
- Mise en place d’une configuration runtime plus sûre.
- Clarification des environnements frontend : local, VPS partagé, production.
- Correction du chargement de `NS_API_BASE_URL` côté application mobile.
- Ajout de tests utiles sur les routes et comportements critiques.
- Refactorisation du module `home` pour améliorer la testabilité.
- Amélioration de la CI GitHub Actions : tests, coverage, build, Prisma check.
- Ajout d’observabilité : logs, request logger et endpoint `/health`.
- Préparation de la stack Docker/Nginx pour un déploiement VPS réel.
- Création de documentations et supports de présentation du sprint.

---

## 📌 Points forts du projet

- Projet complet : mobile, API, base de données, Docker, CI/CD et VPS.
- Architecture backend claire, modulaire et extensible.
- Utilisation professionnelle de Prisma avec migrations versionnées.
- Séparation nette entre environnements local, VPS et production.
- Démarrage backend sécurisé par des checks de configuration.
- Stack production réaliste avec Nginx, Docker Compose et PostgreSQL.
- Healthcheck exploitable pour diagnostiquer rapidement la disponibilité.
- README pensé pour comprendre le projet rapidement.

---

## 📷 Démo

> Section à compléter avec captures d’écran, GIF ou vidéo de démonstration.

Idées de contenu :

- écran d’inscription mobile ;
- tableau de bord client ;
- liste des véhicules ;
- création d’une réservation ;
- endpoint `/health` en production ;
- courte vidéo du parcours utilisateur complet.
