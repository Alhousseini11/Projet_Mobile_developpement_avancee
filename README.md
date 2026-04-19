# Projet_Mobile_developpement_avancee

Le projet est maintenant separe en deux dossiers principaux :

- `frontend/` : application mobile NativeScript/Vue
- `backend/` : API Node.js/Express avec Prisma

Commandes utiles :

- Frontend : `cd frontend && npm install && npm run android`
- Backend : `cd backend && npm install && npm run dev`
- Workflow Prisma backend : `backend/PRISMA_WORKFLOW.md`

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

Production :

- Stack de prod : `docker-compose.prod.yml`
- Variables de prod : `.env.prod` et `backend/.env.prod`
- Reverse proxy : `deploy/nginx/`
- Guide complet : `DEPLOYMENT.md`

Garde-fous backend :

- en production, `DATABASE_URL` et `JWT_SECRET` sont obligatoires
- en production, `DEMO_MODE` doit rester desactive
- si une variable critique manque, le backend refuse de demarrer avec un message lisible
