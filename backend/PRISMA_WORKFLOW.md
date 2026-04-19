# Workflow Prisma

## Source of truth

- `prisma/schema.prisma` definit le schema attendu par le code.
- `prisma/migrations/*` contient l'historique versionne a appliquer sur les bases.
- `prisma db push` ne doit pas etre la solution par defaut en production.

## Scripts npm

- `npm run prisma:generate`
- `npm run prisma:validate`
- `npm run prisma:migrate:dev -- --name <nom_migration>`
- `npm run prisma:migrate:deploy`
- `npm run prisma:status`
- `npm run prisma:check`

## Developpement local

1. Modifier `prisma/schema.prisma`.
2. Creer une migration versionnee :

```bash
npm run prisma:migrate:dev -- --name <nom_migration>
```

3. Committer ensemble :
   - `prisma/schema.prisma`
   - le dossier `prisma/migrations/<timestamp>_<nom_migration>/`

`prisma migrate dev` est le workflow normal en local. Il garde la base et le code alignes
avec des migrations versionnees au lieu de changements manuels non traces.

## Appliquer les migrations

### Base locale ou environnement de test

```bash
npm run prisma:migrate:deploy
```

### Production

Le conteneur backend garde le workflow existant et execute :

```bash
npx prisma migrate deploy && node dist/server.js
```

En plus, le backend lance un preflight Prisma au demarrage. Il refuse de se lancer si :

- la table `_prisma_migrations` est absente
- une migration du repo n'est pas appliquee
- une migration est en echec dans la base
- la base contient une migration absente du code deploye
- une table ou une colonne attendue par Prisma manque reellement

## CI

La CI backend suit maintenant cet ordre :

1. `npm run prisma:generate`
2. `npm run prisma:validate`
3. `npm run prisma:migrate:deploy`
4. `npm run prisma:check`
5. build et tests backend

L'objectif est de verifier le schema Prisma et de prouver que les migrations s'appliquent
sur une base PostgreSQL propre avant l'execution des tests.

## Que faire en cas de drift

### Dev local

Verifier d'abord l'etat :

```bash
npm run prisma:status
npm run prisma:check
```

Si des migrations locales ne sont pas appliquees :

```bash
npm run prisma:migrate:deploy
```

Si la base locale a ete modifiee a la main et ne correspond plus aux migrations, la voie la plus
sure est de repartir d'une base de dev propre puis de reappliquer les migrations versionnees.
Sur une base jetable de developpement seulement, `npx prisma migrate reset` peut etre utilise.

### Production

1. Lire les logs backend pour identifier la migration ou la table/colonne manquante.
2. Executer `npm run prisma:status` dans le conteneur backend.
3. Si des migrations sont en attente, redeployer et laisser `prisma migrate deploy` les appliquer.
4. Si la base a derive manuellement, corriger via une migration Prisma versionnee ou une restauration
   controlee de la base.

Ne pas corriger un environnement de production avec `prisma db push`.
