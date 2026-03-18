# Projet_Mobile_developpement_avancee

Le projet est maintenant separe en deux dossiers principaux :

- `frontend/` : application mobile NativeScript/Vue
- `backend/` : API Node.js/Express avec Prisma

Commandes utiles :

- Frontend : `cd frontend && npm install && npm run android`
- Backend : `cd backend && npm install && npm run dev`

Conteneurisation du backend :

- Copier `backend/.env.example` vers `backend/.env`
- Lancer `docker compose up --build`
- API backend : `http://localhost:3000`
- Base PostgreSQL : `localhost:5433`

Production :

- Stack de prod : `docker-compose.prod.yml`
- Variables de prod : `.env.prod` et `backend/.env.prod`
- Reverse proxy : `deploy/nginx/`
- Guide complet : `DEPLOYMENT.md`
