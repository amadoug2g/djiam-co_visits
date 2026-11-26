# Villa M3 3D : brief de passation et plan

Nov 26, 2026 · Djiam. Version PDF d'origine : `docs/brief.pdf`. La feuille de route, une image dans le PDF, est recopiée ici en texte.

## Résumé

On construit une application web 3D de présentation guidée de la villa témoin M3 (Résidence Keur Cheikh), conçue dès le départ pour se dupliquer ensuite sur les 45 lots de la résidence.

- **Décision technique** : application web en Three.js, hébergée par nous, intégrée au futur site Djiam & Co. Pas d'Unreal Engine : pas d'export web, et un serveur avec carte graphique payé à l'heure par visiteur.
- **Mode d'usage** : toujours présentée par une personne de l'équipe (Amadougaye en premier), jamais visitée seule par le client.
- **Budget** : le plus proche possible de zéro. Outils gratuits ou open source, hébergement statique.
- **Point de départ** : un prototype fonctionnel existe déjà (plan 2D, 3D, visite, lumière pré-calculée, testé à 60 images par seconde sur iPhone).
- **Prochaine étape** : reprendre le prototype dans Claude Code, le restructurer en projet, puis dérouler la phase 1 de la feuille de route.

## Vision et usages

Un seul outil sert quatre usages, pour trois publics : les clients (acheteurs, investisseurs, diaspora), les constructeurs, et les associés.

| Usage | Ce que l'outil doit permettre | Public principal |
|---|---|---|
| Présenter | Visite guidée de la villa, puis de la résidence, avec ambiance et points d'intérêt | Clients |
| Répondre | Surfaces (habitable, extérieure, totale, par pièce) et cotes en quelques secondes | Clients, constructeurs |
| Personnaliser | Matériaux, couleurs et options, avec le coût de chaque choix en FCFA | Clients des villas futures |
| Aménager | Mobilier placé aux vraies dimensions, catalogue alimenté par photos, liste d'achats | Associés, clients |

À terme, la résidence entière (45 lots sur le plan de masse) est représentée en 3D, chaque lot cliquable.

## Périmètre V1 et hors périmètre

La V1 porte sur la villa témoin seule, mais contient toutes les fonctionnalités prévues, pour que les villas suivantes ne soient que des duplications.

**Dans la V1**
- Villa M3 : RDC, puis étage, extérieurs (piscine, pool house, jardins, parking)
- Fiche technique, visite guidée, configurateur avec prix, aménagement, versions, lien client
- Modèle de données prêt pour plusieurs lots

**Hors V1**
- Les 44 autres lots et la maquette complète de la résidence (prévus dans l'architecture, pas construits)
- Espace constructeur détaillé (métrés, quantités, exports chantier)
- Paiement ou réservation en ligne
- Capture 3D du réel (Gaussian splatting), pour quand la villa sera bâtie

Le configurateur de finitions vise les villas futures. Pour la villa témoin, il sert de démonstration.

## Mode d'utilisation : la présentation guidée

L'application est toujours pilotée par un présentateur, sur ordinateur ou tablette, en rendez-vous ou en visio. Le client regarde, pose des questions et choisit ; il ne navigue pas seul.

Conséquences pour la conception :

1. Un parcours de présentation : une suite d'étapes (site, résidence, villa, pièces, options) que le présentateur fait défiler, avec des notes visibles de lui seul.
2. Réponse immédiate : toute cote ou surface accessible en un clic, sans quitter la vue en cours.
3. Personnalisation en direct : le client choisit, le présentateur clique, le prix se met à jour.
4. Trace du rendez-vous : les choix du client sont enregistrés en version, puis partagés par un lien en lecture seule.
5. Continuité avec le site : le site Djiam & Co. et l'application forment un seul parcours guidé (site, puis logiciel, puis lieu).

Le mobile reste supporté pour consulter un lien reçu, mais l'écran principal est l'ordinateur.

## Fonctionnalités V1 par module

L'ordre du tableau suit la priorité.

| Module | Finalité | Contenu V1 |
|---|---|---|
| Fiche technique | Répondre vite aux questions | Surfaces par pièce et totaux (habitable, extérieur, parcelle), cotes, mesure à la demande, hauteurs ; chaque valeur marquée fait, hypothèse ou estimation |
| Visite guidée | Faire ressentir la villa | Parcours par étapes, points d'intérêt cliquables, mini-plan avec position, ambiances jour, coucher de soleil, nuit, musique optionnelle |
| Configurateur | Projeter et chiffrer | Clic sur un sol, un mur ou un meuble pour changer matériau et couleur ; prix de l'option en FCFA ; récapitulatif avec total |
| Aménagement | Meubler aux vraies dimensions | Catalogue catégorisé, placement et rotation, redimensionnement, ajout d'un meuble depuis une photo (modèle 3D généré) ou une simple boîte aux bonnes cotes |
| Liste d'achats | Préparer l'équipement | Liste générée depuis l'aménagement, avec quantités, prix et lien produit |
| Versions | Comparer et garder une trace | Enregistrer une configuration, la dupliquer, en comparer deux |
| Lien client | Prolonger le rendez-vous | Lien en lecture seule vers une version, consultable sur mobile |
| Mode présentateur | Piloter la démo | Interface épurée pour l'écran partagé, notes privées, raccourcis |
| Administration | Tenir le contenu à jour | Matériaux, prix, catalogue, villas et lots édités sans toucher au code |

## Choix techniques et architecture des données

Le principe directeur : la 3D est générée depuis des données, jamais dessinée à la main. Dupliquer une villa revient à créer une fiche, pas à refaire un modèle.

**Trois niveaux de données**
1. Gabarit de villa (M3) : murs, ouvertures, pièces, cotes, hauteurs. Un fichier par gabarit, issu du plan PDF.
2. Variantes : matériaux, couleurs, options, mobilier, chacun avec son prix. Partagées entre gabarits.
3. Lots : numéro, position et orientation sur le plan de masse, gabarit utilisé, choix retenus.

**Pile technique (gratuite)**

| Besoin | Choix | Raison |
|---|---|---|
| Rendu 3D | Three.js | Référence du web 3D, lit le format GLB, gratuit |
| Langage et outillage | TypeScript, Vite | Code fiable, projet structuré, gratuit |
| Interface | React (tranché en phase 0) | Beaucoup d'interface à état dans les phases 3 à 6 ; moteur 3D indépendant |
| Modèles 3D | Format GLB | Standard lu par Three.js, Blender et Unreal : rien n'est perdu si on change de moteur |
| Lumière | Pré-calcul hors ligne (lightmaps), puis ombres et reflets en temps réel | Rendu réaliste qui tourne sur téléphone |
| Hébergement | Site statique : Cloudflare Pages (choisi en phase 0, offre gratuite) | Coût nul, rapide |
| Données partagées (versions, liens) | Fichiers JSON au départ, base gratuite ensuite si besoin | Rester simple tant que possible |

Le détail des offres gratuites est à vérifier au moment de choisir : elles changent.

## Existant

Un prototype fonctionne déjà sous forme d'artifact Claude. Il sert de base, pas de produit fini.

**Ce qui marche**
- Plan 2D du RDC aux cotes du PDF M3_RDC (échelle 1:75), surfaces par pièce, outil de mesure, liste des points à vérifier
- Vue 3D en maquette ouverte, volume d'étage indicatif, visite à la première personne avec collisions
- Moteur Three.js r170 avec ciel, ombres douces, lumière pré-calculée par sommet, occlusion d'écran, halo ; moteur de secours maison
- Diagnostic automatique : 60 images par seconde mesurées sur iPhone, sans erreur

**Faits, hypothèses, estimations**

| Nature | Élément |
|---|---|
| Fait | Murs, fenêtres, pièces et surfaces du RDC relevés sur le PDF vectoriel |
| Fait | Parcelle annoncée 20 × 25 m ; le dessin mesure 19,88 × 24,77 m hors clôture |
| Hypothèse | Portes non dessinées (suite, dressing, salle de bain, chambre bonne, entrée), passage hall vers séjour |
| Hypothèse | Baies côté piscine et façade, reprises des rendus |
| Estimation | Hauteur sous plafond 3 m, étage entièrement estimé |

Fichiers du prototype : model.js (données du plan), geo.js (génération 3D), scene3js.js (rendu Three.js), scene3d.js (secours), bake.js (calcul de lumière), index.html (interface).

## Feuille de route

V1 alpha en 7 phases, environ 14 semaines (estimation). Chaque phase se termine par un critère validé avant de passer à la suivante.

| Phase | Contenu | Critère de fin |
|---|---|---|
| 0 · Fondations · 1 semaine | Projet TypeScript + Vite, portage du prototype, dépôt GitHub. Déploiement statique gratuit, choix React ou sans framework | Prototype en ligne sur notre adresse |
| 1 · Villa exacte · 2 semaines | Hypothèses validées, étage modélisé depuis M3_ETAGE. Fiche technique : surfaces habitable, extérieure, totale | Surfaces validées par les associés |
| 2 · Rendu réaliste · 2 semaines | Lumière pré-calculée en lightmaps, textures libres CC0. Ambiances jour, coucher de soleil, nuit | Rendu présentable en rendez-vous client |
| 3 · Visite guidée · 2 semaines | Parcours par étapes, points d'intérêt, mini-plan. Mode présentateur avec notes privées | Démo complète réussie en rendez-vous test |
| 4 · Aménagement · 3 semaines | Catalogue de meubles, placement, meuble depuis une photo. Liste d'achats avec quantités et prix | Villa meublée et chiffrée |
| 5 · Configurateur et versions · 2 semaines | Matériaux et couleurs au clic, prix en FCFA, total. Versions comparées, lien client en lecture seule | Parcours client complet, du choix au lien partagé |
| 6 · Site et multi-lots · 2 semaines | Intégration au site Djiam & Co., modèle prêt pour les 45 lots. Administration des matériaux, des prix et des lots | V1 alpha publiée |

Les durées sont des estimations pour un développeur seul à temps partiel. L'ordre compte plus que les dates : une phase ne démarre que lorsque le critère de la précédente est validé.

## Budget et outils gratuits

Objectif : 0 FCFA par mois en dehors de l'abonnement Claude déjà payé.

| Poste | Solution gratuite | Limite à surveiller |
|---|---|---|
| Développement | Claude Code (abonnement existant), VS Code | Aucune |
| Code source | GitHub, dépôt privé | Aucune pour un projet de cette taille |
| Hébergement | Offre gratuite d'un hébergeur statique | Bande passante si beaucoup de visites |
| Modèles 3D et pré-calcul de lumière | Blender | Apprentissage |
| Textures | Bibliothèques sous licence libre (CC0), ou photos de vos propres matériaux | Vérifier la licence de chaque fichier |
| Meubles depuis une photo | Outils de génération photo vers 3D, versions gratuites | Quotas mensuels et qualité variables |

Seul poste susceptible de devenir payant : la génération de meubles depuis des photos, si le volume dépasse les quotas gratuits. À évaluer en phase 4.

## Questions ouvertes

- Portes et passage non dessinés sur le plan : positions à valider sur la visite
- Hauteur sous plafond réelle du RDC et de l'étage
- Étage : lequel des deux PDF M3_ETAGE est la référence
- Variantes A, B et C : options proposées aux clients ou simples essais ?
- Prix des finitions et du mobilier : quelle source (devis fournisseurs, catalogue) ?
- Nom de domaine et hébergeur du futur site
- Musique d'ambiance : morceau sous licence libre ou composition maison
- Ajoutées par le correctif du 26/11/2026 : profondeur du parking, sortie de la cuisine (voir `docs/CORRECTIF.md`)
