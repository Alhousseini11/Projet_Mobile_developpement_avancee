# Projet_Mobile_developpement_avancee

Le projet est maintenant separe en deux dossiers principaux :

- `frontend/` : application mobile NativeScript/Vue
- `backend/` : API Node.js/Express avec Prisma

Commandes utiles :

- Frontend : `cd frontend && npm install && npm run android:local`
- Backend : `cd backend && npm install && npm run dev`
- Workflow Prisma backend : `backend/PRISMA_WORKFLOW.md`

Configuration frontend mobile :

- `frontend/app/utils/api.ts` ne contient plus de fallback implicite vers le VPS.
- `NS_API_BASE_URL` doit etre configure explicitement pour chaque contexte.
- Exemples versionnes :
  - `frontend/.env.local.example`
  - `frontend/.env.shared-vps.example`
  - `frontend/.env.prod.example`
- Scripts explicites :
  - local : `npm run android:local` / `npm run ios:local`
  - VPS partage : `npm run android:shared-vps` / `npm run ios:shared-vps`
  - build prod : `npm run build:android:prod` / `npm run build:ios:prod`

Conteneurisation du backend :

- Copier `.env.example` vers `.env`
- Copier `backend/.env.example` vers `backend/.env`
- Lancer `docker compose up --build`
- API backend : `http://localhost:3000`
- Base PostgreSQL : `localhost:5433`

Variables attendues :

- `./.env` : variables Docker Compose locales (`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL` vers `postgres:5432`)
- `backend/.env` : variables backend pour `npm run dev` et `npm test` (`DATABASE_URL` vers `localhost:5433`, `JWT_SECRET`, puis les integrations optionnelles)
- `DEMO_MODE` est desactive par defaut. Active-le explicitement en local seulement si tu veux exposer le compte de demo.
- `CORS_ALLOWED_ORIGINS` : liste separee par des virgules des origines navigateur autorisees. En prod, renseigne-la explicitement pour l'admin web ou tout autre client navigateur.
- `TRUST_PROXY` : mettre `1` si le backend est derriere Nginx ou un load balancer afin d'utiliser la vraie IP client pour les logs et le rate limit.
- `HTTP_JSON_LIMIT` : taille max acceptee pour les payloads JSON et formulaires URL-encoded.
- `AUTH_RATE_LIMIT_*` : garde-fous minimaux sur `register`, `login`, `forgot-password`, `reset-password` et le formulaire HTML de reset. Actifs par defaut en production, desactives par defaut en local.

Production :

- Stack de prod : `docker-compose.prod.yml`
- Variables de prod : `.env.prod` et `backend/.env.prod`
- Reverse proxy : `deploy/nginx/`
- Guide complet : `DEPLOYMENT.md`

Garde-fous backend :

- en production, `DATABASE_URL` et `JWT_SECRET` sont obligatoires
- en production, `DEMO_MODE` doit rester desactive
- si une variable critique manque, le backend refuse de demarrer avec un message lisible
