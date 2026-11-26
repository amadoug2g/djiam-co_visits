# Villa M3 3D

Application web 3D de présentation guidée de la villa témoin M3, Résidence Keur Cheikh (DJIAM&CO SARL).
Règles du projet : `CLAUDE.md`. Brief et feuille de route : `BRIEF.md`.

## Lancer en local

Il faut Node.js 22 (voir `.nvmrc`).

```bash
npm ci          # installe les dépendances (versions figées)
npm run dev     # serveur de développement sur http://localhost:5173
npm run build   # vérifie les types puis construit le site statique dans dist/
npm run preview # sert dist/ pour vérifier le build
```

Panneau de diagnostic : ajouter `?diag=1` à l'adresse (images par seconde, qualité, lumière chargée, erreurs). Rien n'est envoyé.

## Tests

```bash
npm test          # tests unitaires et de non-régression (Vitest)
npm run test:e2e  # test de bout en bout dans Chromium, après npm run build
```

- `tests/geometry.test.ts` : la géométrie générée depuis `m3.json` est identique à celle du prototype corrigé (`reference/prototype-corrige`), aux écarts voulus près, listés un par un dans le test.
- `tests/bake.test.ts` : le calcul de lumière porté produit le même fichier, octet pour octet, que `bake.js` du prototype.
- `tests/bake-fresh.test.ts` : la lumière de `public/bake/` correspond à la géométrie actuelle. S'il échoue, relancer `npm run bake`.
- `tests/data.test.ts` : intégrité du gabarit (identifiants, renvois, sources `plan`/`est`, surfaces).
- `tests/walk.test.ts` : règles de la visite (collisions, passages, placement dans chaque pièce).
- `tests/format.test.ts` : formats et calculs affichés.
- `tests/e2e/smoke.mjs` : plan, fiche pièce, mesure, points à vérifier, 3D, visite, mobile, sans erreur console. Il demande Playwright : `npm i -D playwright && npx playwright install chromium`.

## Modifier la villa

La 3D est générée depuis les données, jamais modélisée à la main.

1. Éditer `src/data/gabarits/m3.json`. Chaque élément venant du plan porte `src: "plan"` (relevé sur le PDF) ou `src: "est"` (estimé). Les points à valider sont dans `checks` et s'affichent dans l'onglet « À vérifier ».
2. Recalculer la lumière : `npm run bake` (gabarit `m3`, 100 rayons, environ 2 minutes). Cela écrit `public/bake/m3.bin` et `m3.json`.
3. `npm test`.

## Organisation

```
src/data/          gabarits (JSON) et leurs types
src/geo/           génération de la géométrie (navigateur et Node)
src/engine/        moteur Three.js, indépendant de l'interface
src/ui/            interface React (plan 2D, panneaux, outils)
scripts/           calcul de la lumière
public/bake/       lumière pré-calculée
reference/         prototype corrigé de référence et script de conversion (ne pas modifier)
sources/           plans PDF, rendus, images du correctif
docs/              correctif du 26/11/2026, brief PDF
```

## Déploiement : GitHub Pages (gratuit pour un dépôt public)

Adresse : https://amadoug2g.github.io/djiam-co_visits/

Chaque push sur `main` ou sur la branche de travail lance `.github/workflows/deploy.yml` : `npm ci`, `npm test`, `npm run build`, puis publication de `dist/` sur la branche `gh-pages`. GitHub Pages sert cette branche et republie en une minute environ. Si un test échoue, rien n'est publié.

Le site est public : toute personne qui a le lien peut l'ouvrir (la page demande aux moteurs de recherche de ne pas l'indexer). GitHub Pages ne publie pas un dépôt privé avec un compte gratuit.

Plus tard, pour un domaine à vous ou un dépôt privé : Cloudflare Pages (offre gratuite), en le branchant sur le dépôt avec `npm run build` et le dossier `dist`.
