# Deploiement Production

Ce projet peut etre deploie sur un VPS Ubuntu avec Docker et Docker Compose.

## 1. Prerequis

- Un VPS Ubuntu 24.04 ou equivalent
- Docker et Docker Compose installes
- Un nom de domaine pointant vers l'IP du serveur

## 2. Recuperer le projet

```bash
git clone <URL_DU_REPO>
cd Projet_Mobile_developpement_avancee
```

## 3. Preparer les variables

Copier les fichiers d'exemple :

```bash
cp .env.prod.example .env.prod
cp backend/.env.prod.example backend/.env.prod
cp deploy/nginx/conf.d/backend.conf.example deploy/nginx/conf.d/backend.conf
cp deploy/nginx/conf.d/admin-web.conf.example deploy/nginx/conf.d/admin-web.conf
mkdir -p deploy/certs
```

Remplacer dans `.env.prod` :

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `DATABASE_URL` avec l'URL PostgreSQL du conteneur `postgres`
- `ADMIN_WEB_API_URL` avec l'URL HTTPS publique de l'API, par exemple `https://api.garageplus.org`

Remplacer dans `backend/.env.prod` :

- `JWT_SECRET`
- les cles Stripe, AWS et Google si necessaire
- `PASSWORD_RESET_URL` et `PUBLIC_BASE_URL` si exposes publiquement
- `CORS_ALLOWED_ORIGINS` avec les origines navigateur autorisees, par exemple `https://admin.garageplus.org`
- `TRUST_PROXY=1` si le backend est derriere Nginx

Le Dockerfile backend ne fournit plus aucune valeur sensible par defaut :

- l'image de build utilise uniquement une URL Prisma factice non sensible pour `prisma generate`
- la vraie `DATABASE_URL` doit etre injectee au runtime par `docker compose` via `.env.prod`
- si `DATABASE_URL` ou `JWT_SECRET` manquent au runtime en production, le backend echoue explicitement au demarrage
- `DEMO_MODE` est desactive par defaut et doit rester a `false` en production
- si `CORS_ALLOWED_ORIGINS` est vide en production, seuls les clients sans header `Origin` (mobile natif, curl, healthchecks) restent acceptes sans restriction CORS navigateur
- le rate limit auth est actif par defaut en production; vous pouvez l'ajuster avec `AUTH_RATE_LIMIT_ENABLED`, `AUTH_RATE_LIMIT_WINDOW_MS` et `AUTH_RATE_LIMIT_MAX_REQUESTS`

Remplacer dans `deploy/nginx/conf.d/backend.conf` :

- `api.example.com` par votre vrai domaine

Remplacer dans `deploy/nginx/conf.d/admin-web.conf` :

- `admin.garageplus.org` par votre vrai sous-domaine admin si vous choisissez un autre nom

## 4. Certificats SSL

La configuration Nginx attend les fichiers suivants :

- `deploy/certs/fullchain.pem`
- `deploy/certs/privkey.pem`
- `deploy/certs/admin.garageplus.org.fullchain.pem`
- `deploy/certs/admin.garageplus.org.privkey.pem`

Vous pouvez les generer avec Let's Encrypt sur le serveur, puis les copier dans `deploy/certs/`.

Exemple avec Certbot en mode standalone :

```bash
sudo apt update
sudo apt install -y certbot
sudo certbot certonly --standalone -d api.example.com
sudo cp /etc/letsencrypt/live/api.example.com/fullchain.pem deploy/certs/
sudo cp /etc/letsencrypt/live/api.example.com/privkey.pem deploy/certs/
sudo chown $USER:$USER deploy/certs/fullchain.pem deploy/certs/privkey.pem
```

Exemple pour l'admin web sur `admin.garageplus.org` :

```bash
sudo certbot certonly --standalone -d admin.garageplus.org
sudo cp /etc/letsencrypt/live/admin.garageplus.org/fullchain.pem deploy/certs/admin.garageplus.org.fullchain.pem
sudo cp /etc/letsencrypt/live/admin.garageplus.org/privkey.pem deploy/certs/admin.garageplus.org.privkey.pem
sudo chown $USER:$USER deploy/certs/admin.garageplus.org.fullchain.pem deploy/certs/admin.garageplus.org.privkey.pem
```

## 5. Lancer la stack

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

## 6. Verifier

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f backend
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f admin-web
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f nginx
docker compose --env-file .env.prod -f docker-compose.prod.yml exec backend npm run prisma:status
```

Le backend conserve le workflow Docker actuel: le conteneur lance `prisma migrate deploy` avant `node dist/server.js`.
Au demarrage, l'application verifie aussi que toutes les migrations versionnees du repo sont appliquees
et que les tables/colonnes attendues par Prisma existent vraiment. Si ce preflight echoue, le backend
refuse de demarrer au lieu de crasher plus tard au premier acces a une colonne manquante.

## 7. Mise a jour

```bash
git pull
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

Si le backend ne redemarre pas apres une mise a jour, verifier en priorite :

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml logs backend
docker compose --env-file .env.prod -f docker-compose.prod.yml exec backend npm run prisma:status
```

En production, la correction par defaut est de redeployer le code avec ses migrations versionnees
et de laisser `prisma migrate deploy` les appliquer. Ne pas utiliser `prisma db push` comme
solution de production.

## 8. Sauvegarde base de donnees

```bash
docker exec garage-postgres-prod pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
```

## Notes

- En production, PostgreSQL n'est pas expose publiquement.
- L'admin web est servi sur un sous-domaine dedie, par exemple `https://admin.garageplus.org`.
- Le backend doit autoriser ce sous-domaine via `CORS_ALLOWED_ORIGINS`.
- Le backend n'est pas expose directement non plus : seul Nginx ouvre `80` et `443`.
- Pensez a utiliser de vrais secrets de production.
