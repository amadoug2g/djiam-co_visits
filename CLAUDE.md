# Villa M3 3D : règles du projet

Application web 3D de présentation guidée de la villa témoin M3, Résidence Keur Cheikh (DJIAM&CO SARL, Sénégal).
Le brief complet est dans BRIEF.md. Le lire avant toute tâche.

## Contexte
- Développeur unique : Amadougaye Cissé, co-gérant. Il valide chaque plan avant le code.
- L'application est toujours présentée par une personne de l'équipe, jamais utilisée seule par le client.
- Écran principal : ordinateur. Le mobile doit rester fluide pour consulter un lien.
- Budget : zéro. Uniquement des outils gratuits ou open source, hébergement statique.

## Communication
- Français, tutoiement, direct et concis.
- Jamais de tiret cadratin, jamais d'emoji.
- Distinguer toujours fait, hypothèse et estimation. Dire quand on ne sait pas.
- Montants en FCFA, avec la conversion en euros en sous-titre (taux fixe : 1 € = 656 FCFA).

## Principes techniques
- Three.js pour le rendu, TypeScript + Vite. Modèles 3D au format GLB.
- La 3D est générée depuis des données, jamais modélisée à la main :
  gabarit de villa (murs, ouvertures, pièces) / variantes (matériaux, options, prix) / lots (position, choix).
- Toute donnée issue du plan porte sa source : "plan" (relevé sur le PDF) ou "est" (estimé). L'interface les distingue.
- Coordonnées en mètres, repère du PDF M3_RDC à l'échelle 1:75 (1 m = 37,795 pt). X = x du plan, Z = y du plan, Y = hauteur.
- La lumière pré-calculée doit être régénérée après toute modification de géométrie.
- Rester à la taille d'une petite entreprise : pas de sur-architecture.

## Organisation du projet
- src/data/gabarits/m3.json : gabarit M3 (source de vérité, éditée à la main ; plus de mirror.js ni de M.mirror)
- src/geo/ : génération de la géométrie 3D (partagée navigateur et Node)
- src/engine/ : moteur Three.js r170, indépendant de l'interface
- src/ui/ : interface React (plan 2D, panneaux, outils), diagnostic local avec ?diag=1
- scripts/bake.ts : calcul de la lumière (`npm run bake`), écrit public/bake/<gabarit>.bin et .json
- tests/ : `npm test` (Vitest) et `npm run test:e2e` (navigateur)
- reference/prototype-corrige/ : prototype de référence après correctif, pour les tests de non-régression (ne pas modifier)
- sources/plans/, sources/rendus/, sources/correctif/ : PDF, rendus, images avant/après du correctif
- docs/CORRECTIF.md : correctif gauche/droite du 26/11/2026

## Points ouverts connus
Voir la section "Questions ouvertes" de BRIEF.md (portes non dessinées, hauteurs, étage de référence, variantes, prix) et l'onglet "À vérifier" de l'application (dont profondeur du parking et sortie de la cuisine).
