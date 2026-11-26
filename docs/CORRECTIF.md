# Correctif plan M3 RDC (validé par Amadougaye le 26/11/2026)

Le plan PDF est juste, mais l'intérieur était inversé gauche/droite. La version de référence est maintenant `prototype/model.js`.

## Ce qui change (repère : on regarde la maison depuis la rue)
- **Maison :** inversée gauche/droite et centrée sur la parcelle.
  - Passage d'environ 1,2 m de chaque côté, de l'avant à l'arrière. Il n'est pas sur le plan, mais il existe en réalité.
  - Cuisines, buanderie et toilettes passent à gauche. Suite parentale et dressing passent à droite.
- **Porche et escalier :** le porche d'entrée est à droite de l'escalier, et la suite est à droite du porche.
- **Côté droit, côté extérieur :** pas de sortie, le mur est continu du salon jusqu'à la suite. La porte vitrée latérale du hall est supprimée.
- **Côté gauche :** une sortie vers le passage par la cuisine américaine. C'est une hypothèse (`src: est`, id `d-cuis-ext`) : position exacte à confirmer.
- **Fond de parcelle inversé :** piscine, plage, jardin, pool house à gauche, local technique et douche à droite.
- **Inchangés :** clôture, portails, parking, jardin de façade, allée côté rue, chambre gardien et SE.
  - Un dallage relie l'allée au porche (hypothèse).
- **Voiture type :** 4,60 x 1,85 m posée dans le parking (`M.cars`), pour juger la place.

## Point ouvert
- **Profondeur du parking (fait, calculé).** Elle passe de 4,95 m à 3,76 m, parce que la chambre bonne avance plus vers la rue. La voiture type dépasse donc d'environ 0,9 m.
- **Ce qu'Amadougaye pense :** il y a plus de place en réalité. La profondeur de la chambre bonne ou celle du parking est à confirmer sur place.

## Notes techniques
- **`model.js` est généré par `mirror.js`** à partir de `model_v0_plan-brut.js`. On ne relance pas `mirror.js` : à partir de maintenant, on édite directement le JSON du gabarit.
- **`geo.js` contient encore un mécanisme provisoire (`M.mirror`, `setM`)** pour retourner le mobilier et les annexes codés en dur.
  - Pendant le portage, il faut sortir ce mobilier dans les données du gabarit, en coordonnées absolues, puis supprimer `M.mirror`.
  - Le test « géométrie identique au prototype » se fait contre ce prototype corrigé.
- **`baked.txt` n'est plus à jour** (la géométrie a changé). Il faut recalculer la lumière avec le nouveau `model.js`.
- **`index.html` lit maintenant la piscine, le pool house, les fentes de façade (`M.slits`), le claustra (`M.claustraX`) et la voiture (`M.cars`) dans le modèle.** Ce n'est plus codé en dur.
