# QA Checklist - Diff Assistant 2.0

## 📋 Vue d'ensemble
Ce document liste tous les scénarios de test à valider avant le déploiement du Diff Assistant 2.0.

**Version :** 2.0
**Date :** Octobre 2025
**Testeur :** _____________
**Environnement :** Dev / Staging / Prod _(cocher)_

---

## ✅ Tests fonctionnels

### 1. Création de proposition

| # | Scénario | Résultat attendu | ✓/✗ | Notes |
|---|----------|------------------|-----|-------|
| 1.1 | Créer une proposition pour un fichier valide | Proposition ajoutée avec succès | ☐ | |
| 1.2 | Créer une proposition pour un dossier | Erreur "Path is not a file" | ☐ | |
| 1.3 | Créer une proposition avec URI invalide (non-file) | Erreur "Invalid URI scheme" | ☐ | |
| 1.4 | Créer une proposition pour un fichier inexistant | Erreur de validation | ☐ | |

### 2. Affichage de la vue ProposalsView

| # | Scénario | Résultat attendu | ✓/✗ | Notes |
|---|----------|------------------|-----|-------|
| 2.1 | Ouvrir la vue avec 0 proposition | Vue cachée (display: none) | ☐ | |
| 2.2 | Ouvrir la vue avec 3 propositions | Liste de 3 cartes affichées | ☐ | |
| 2.3 | Cliquer sur le toggle (flèche) | Vue se plie/déplie | ☐ | |
| 2.4 | Vérifier les statistiques de changements | Affichage "+X -Y" correct | ☐ | |

### 3. Affichage des chunks

| # | Scénario | Résultat attendu | ✓/✗ | Notes |
|---|----------|------------------|-----|-------|
| 3.1 | Chunk avec oldText et newText | Diff rouge + vert visible | ☐ | |
| 3.2 | Chunk avec uniquement newText (ajout) | Bloc vert uniquement | ☐ | |
| 3.3 | Chunk avec uniquement oldText (suppression) | Bloc rouge uniquement | ☐ | |
| 3.4 | Hover sur un chunk | Border devient focusBorder + shadow | ☐ | |

### 4. Acceptation de chunks

| # | Scénario | Résultat attendu | ✓/✗ | Notes |
|---|----------|------------------|-----|-------|
| 4.1 | Accepter un seul chunk | Chunk disparaît, autres restent | ☐ | |
| 4.2 | Accepter tous les chunks d'un fichier | Toute la carte disparaît | ☐ | |
| 4.3 | Accepter le dernier chunk restant | Proposition marquée "accepted" | ☐ | |
| 4.4 | Vérifier les changements dans l'éditeur | Modifications appliquées | ☐ | |
| 4.5 | Tester Ctrl+Z après acceptation | Rollback complet du chunk | ☐ | |

### 5. Rejet de chunks

| # | Scénario | Résultat attendu | ✓/✗ | Notes |
|---|----------|------------------|-----|-------|
| 5.1 | Rejeter un seul chunk | Chunk disparaît, autres restent | ☐ | |
| 5.2 | Rejeter tous les chunks d'un fichier | Toute la carte disparaît | ☐ | |
| 5.3 | Vérifier qu'aucun changement n'est appliqué | Fichier inchangé | ☐ | |

### 6. Acceptation/Rejet global

| # | Scénario | Résultat attendu | ✓/✗ | Notes |
|---|----------|------------------|-----|-------|
| 6.1 | Cliquer "Accept all" (bouton global) | Toutes les propositions acceptées | ☐ | |
| 6.2 | Cliquer "Reject all" (bouton global) | Toutes les propositions rejetées | ☐ | |
| 6.3 | Cliquer "Accept all" sur une carte | Tous les chunks du fichier acceptés | ☐ | |
| 6.4 | Cliquer "Reject all" sur une carte | Tous les chunks du fichier rejetés | ☐ | |

### 7. Décorations dans l'éditeur

| # | Scénario | Résultat attendu | ✓/✗ | Notes |
|---|----------|------------------|-----|-------|
| 7.1 | Ouvrir un fichier avec proposition | Décorations visibles (lignes colorées) | ☐ | |
| 7.2 | Hover sur une ligne décorée | Message tooltip avec avant/après | ☐ | |
| 7.3 | Hover sur une ligne décorée | Widget Accept/Reject apparaît | ☐ | |
| 7.4 | Accepter via le widget | Décoration disparaît | ☐ | |
| 7.5 | Quitter l'éditeur avec la souris | Widget disparaît après 200ms | ☐ | |

### 8. Synchronisation vue/éditeur

| # | Scénario | Résultat attendu | ✓/✗ | Notes |
|---|----------|------------------|-----|-------|
| 8.1 | Accepter chunk dans ProposalsView | Décoration disparaît dans l'éditeur | ☐ | |
| 8.2 | Accepter chunk via widget éditeur | Chunk disparaît dans ProposalsView | ☐ | |
| 8.3 | Rejeter chunk dans ProposalsView | Décoration disparaît dans l'éditeur | ☐ | |
| 8.4 | Rejeter chunk via widget éditeur | Chunk disparaît dans ProposalsView | ☐ | |

### 9. Système transactionnel

| # | Scénario | Résultat attendu | ✓/✗ | Notes |
|---|----------|------------------|-----|-------|
| 9.1 | Accepter 3 chunks | 3 transactions créées | ☐ | |
| 9.2 | Appeler `getFileTransactions()` | Liste de 3 transactions retournée | ☐ | |
| 9.3 | Rollback d'une transaction spécifique | Contenu restauré | ☐ | |
| 9.4 | Rollback complet d'un fichier | Toutes les transactions annulées | ☐ | |
| 9.5 | Vérifier l'historique undo/redo | Intégration native VSCode OK | ☐ | |

---

## 🎨 Tests visuels

### Thème clair

| # | Scénario | Résultat attendu | ✓/✗ | Notes |
|---|----------|------------------|-----|-------|
| 10.1 | Chunk ajouté | Fond vert pâle, bordure verte | ☐ | |
| 10.2 | Chunk supprimé | Fond rouge pâle, bordure rouge | ☐ | |
| 10.3 | Boutons Accept/Reject | Contraste suffisant | ☐ | |

### Thème sombre

| # | Scénario | Résultat attendu | ✓/✗ | Notes |
|---|----------|------------------|-----|-------|
| 10.4 | Chunk ajouté | Fond vert sombre, bordure verte vive | ☐ | |
| 10.5 | Chunk supprimé | Fond rouge sombre, bordure rouge vive | ☐ | |
| 10.6 | Boutons Accept/Reject | Contraste suffisant | ☐ | |

### Animations

| # | Scénario | Résultat attendu | ✓/✗ | Notes |
|---|----------|------------------|-----|-------|
| 10.7 | Hover sur chunk card | Transition smooth (0.2s) | ☐ | |
| 10.8 | Apparition du widget | FadeInUp animation | ☐ | |
| 10.9 | Disparition d'une carte | SlideOutDown animation | ☐ | |

---

## ⚡ Tests de performance

| # | Scénario | Résultat attendu | ✓/✗ | Notes |
|---|----------|------------------|-----|-------|
| 11.1 | Propositions avec 50 chunks | UI réactive (<100ms render) | ☐ | |
| 11.2 | Accepter 20 chunks d'un coup | Pas de freeze UI | ☐ | |
| 11.3 | Rollback d'un fichier lourd (500 lignes) | MTTR <30s | ☐ | |
| 11.4 | Ouverture de la vue avec 10 propositions | Pas de lag | ☐ | |

---

## 🔒 Tests de sécurité

| # | Scénario | Résultat attendu | ✓/✗ | Notes |
|---|----------|------------------|-----|-------|
| 12.1 | Chemin avec `../../../etc/passwd` | Rejet avec validation | ☐ | |
| 12.2 | URI avec schéma `http://` | Rejet "Invalid URI scheme" | ☐ | |
| 12.3 | Chemin vers `/dev/null` | Rejet (pas un fichier) | ☐ | |

---

## 🐛 Tests de régression

| # | Scénario | Résultat attendu | ✓/✗ | Notes |
|---|----------|------------------|-----|-------|
| 13.1 | Propositions existantes (ancien système) | Toujours fonctionnelles | ☐ | |
| 13.2 | Boutons globaux Accept all/Reject all | Fonctionnent toujours | ☐ | |
| 13.3 | Diff editor (vue côte-à-côte) | Toujours accessible | ☐ | |

---

## 📱 Tests de compatibilité

| # | Environnement | Résultat | ✓/✗ | Notes |
|---|---------------|----------|-----|-------|
| 14.1 | Windows 11 | OK | ☐ | |
| 14.2 | macOS (Intel) | OK | ☐ | |
| 14.3 | macOS (Apple Silicon) | OK | ☐ | |
| 14.4 | Linux (Ubuntu 22.04) | OK | ☐ | |

---

## 🧪 Tests automatisés

| # | Test suite | Résultat | ✓/✗ | Notes |
|---|------------|----------|-----|-------|
| 15.1 | `transactionManager.test.ts` | Tous passent | ☐ | |
| 15.2 | `proposalWorkflow.test.ts` | Tous passent | ☐ | |

---

## 📝 Checklist finale

- [ ] Tous les tests fonctionnels sont passés (sections 1-9)
- [ ] Tous les tests visuels sont passés (section 10)
- [ ] Les performances respectent les KPI (<30s rollback)
- [ ] Aucune vulnérabilité de sécurité détectée
- [ ] Pas de régression sur les fonctionnalités existantes
- [ ] Tests automatisés au vert
- [ ] Documentation à jour ([DIFF_ASSISTANT_2.0.md](src/vs/workbench/contrib/alphacode/DIFF_ASSISTANT_2.0.md))
- [ ] Roadmap mis à jour avec statut ✅

---

## 🚦 Décision finale

- [ ] **GO** - Prêt pour le déploiement
- [ ] **NO GO** - Blockers identifiés (voir section Notes)

### Blockers identifiés
_Liste des problèmes critiques à résoudre avant déploiement :_

1. ___________________________________________
2. ___________________________________________
3. ___________________________________________

### Notes additionnelles
_Observations, suggestions, améliorations futures :_

```
[Espace pour notes du testeur]
```

---

**Signature testeur :** _______________
**Date de validation :** _______________
**Validé par (Lead Dev) :** _______________
