# Utiliser le backend du VPS

Ce dossier peut etre envoye a l'equipe pour expliquer comment utiliser le backend deja deploye sur le VPS.

## URL du backend

Utilisez cette URL :

```txt
http://167.99.178.126:3000/api
```

## Important

- Si vous utilisez cette URL, vous utilisez le backend du VPS.
- Donc vous utilisez aussi la base de donnees connectee au backend du VPS.
- Vous n'avez pas besoin de lancer votre backend local.
- Vous n'avez pas besoin de configurer votre base locale pour travailler sur le frontend.

## Quand utiliser cette URL

Utilisez cette URL si vous voulez :

- tester rapidement le frontend
- partager le meme backend avec l'equipe
- eviter de lancer PostgreSQL + backend en local

## Quand ne pas utiliser cette URL

N'utilisez pas cette URL si vous voulez :

- developper le backend avec votre propre base locale
- tester des donnees isolees
- modifier des routes backend sans impacter la base partagee

Dans ce cas, chacun doit lancer son backend local avec sa propre `DATABASE_URL`.

## Configuration dans le frontend

Le frontend mobile ne doit plus etre modifie a la main pour changer l'URL API.
Copiez plutot l'exemple VPS partage puis utilisez le script npm dedie :

```bash
cd frontend
cp .env.shared-vps.example .env.shared-vps
npm run android:shared-vps
```

## Etapes pour un collegue

1. Recuperer le projet depuis GitHub.
2. Installer les dependances du frontend.
3. Copier `frontend/.env.shared-vps.example` vers `frontend/.env.shared-vps`.
4. Lancer seulement le frontend.

Exemple :

```bash
git clone <url-du-repo>
cd Projet_Mobile_developpement_avancee/frontend
npm install
cp .env.shared-vps.example .env.shared-vps
npm run android:shared-vps
```

## Verification rapide

Si tout est bon, l'application doit pouvoir appeler :

```txt
http://167.99.178.126:3000/api/profile
http://167.99.178.126:3000/api/reservations/services
```

## Compte demo

```txt
Email: alex.martin@example.com
Mot de passe: Garage123!
```

## Resume simple

- URL VPS partagee = backend partage + base partagee
- Backend local = base locale
