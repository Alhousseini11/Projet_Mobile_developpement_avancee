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
mkdir -p deploy/certs
```

Remplacer dans `.env.prod` :

- `POSTGRES_PASSWORD`
- `DATABASE_URL`

Remplacer dans `backend/.env.prod` :

- `DATABASE_URL`
- `JWT_SECRET`
- les cles Stripe, AWS et Google si necessaire

Remplacer dans `deploy/nginx/conf.d/backend.conf` :

- `api.example.com` par votre vrai domaine

## 4. Certificats SSL

La configuration Nginx attend les fichiers suivants :

- `deploy/certs/fullchain.pem`
- `deploy/certs/privkey.pem`

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

## 5. Lancer la stack

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

## 6. Verifier

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f backend
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
- Le backend n'est pas expose directement non plus : seul Nginx ouvre `80` et `443`.
- Pensez a utiliser de vrais secrets de production.
