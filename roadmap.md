# Roadmap AlphaCode

## Vue d'ensemble
- **Périmètre** : Assistant de différences intégré, chat multi-conversation, contrôle fin des outils IA, pipelines de déploiement sécurisés.
- **Horizon** : Sprints 43 à 50 (octobre – décembre 2025), cadence bi-hebdomadaire.
- **KPI** : Taux d'acceptation des propositions (>70 %), satisfaction chat (CSAT 4,5/5), MTTR rollback < 30 s, stabilité release (0 incident P0).

---

## 🔴 Priorités immédiates (Sprints 43-44 • 13-24 octobre 2025)

### P1 - Diff Assistant 2.0 ✅
- **Objectif** : Appliquer les propositions d'IA directement dans l'éditeur avec un rollback fiable.
- **Livrables**
  - [x] Injection directe des modifications sur le buffer actif avec prévisualisation ligne par ligne.
  - [x] Moteur de rollback transactionnel (annulation complète ou partielle).
  - [x] Correction du chemin d'écriture pour éviter l'ouverture de répertoires inattendus.
  - [x] Refonte de la vue de validation par chunks avec diff rouge/vert et boutons Accept/Reject synchronisés.
- **Fichiers créés/modifiés** :
  - ✨ Nouveaux : `transactionManager.ts`, `proposalUndoElement.ts`, `DIFF_ASSISTANT_2.0.md`
  - 🔧 Modifiés : `proposalManager.ts`, `proposalsView.ts`, `proposalsView.css`, `proposalEditorService.ts`
  - 🧪 Tests : `transactionManager.test.ts`, `proposalWorkflow.test.ts`

### P2 - Observabilité chat et outils IA
- **Objectif** : Offrir un feedback clair pendant la génération et l'exécution des outils.
- **Livrables**
  - [ ] Détection en streaming des blocs ```tool pour déclencher l'UI dédiée.
  - [ ] Indicateur visuel dynamique (thinking/loading) sur chaque message.
  - [ ] Rafraîchissement incrémental du chat pendant l'exécution d'un outil (streaming message-by-message).
  - [ ] Application du layout "Outils" dès la fin de la génération de l'outils.
  - [ ] Exécution automatique de l'outil une fois la génération terminée et logs corrélés.

### P3 - Préparation QA ciblée
- **Objectif** : Sécuriser la livraison des fonctionnalités critiques.
  - [ ] Jeu de tests exploratoires pour l'assistant de différences.
  - [ ] Scénarios d'intégration chat+outils (happy path + erreurs réseau).
  - [ ] Documentation rapide pour support interne.

---

## Phase 2 – Expérience Chat (Sprints 45-46 • 27 octobre - 7 novembre 2025)

### 2.1 Gestion de pièces jointes
- **Statut** : À démarrer
- **Livrables**
  - [ ] UI d'ajout et d'aperçu (formats texte, image, archive).
  - [ ] Upload sécurisé (quota, validation MIME, chiffrement au repos).
  - [ ] API backend pour stockage et métadonnées.
  - [ ] Gestion des erreurs et retours utilisateur.

### 2.2 Multi-conversations et reprise
- **Statut** : À démarrer
- **Livrables**
  - [ ] Vue de gestion (liste, recherche, filtres).
  - [ ] Persistance locale avec option de synchronisation serveur.
  - [ ] Actions dupliquer, archiver, restaurer.
  - [ ] Rejeu de segments conversationnels.

### 2.3 Résilience contexte IA
- **Statut** : À démarrer
- **Livrables**
  - [ ] Résumé automatique des échanges longs.
  - [ ] Visualisation du contexte actif (messages épinglés).
  - [ ] Détection et alerte sur perte de contexte.
  - [ ] Restauration rapide après reconnexion.

---

## Phase 3 – Contrôle des outils IA (Sprints 47-48 • 10-21 novembre 2025)

### 3.1 Surface produit
- **Nouveaux fichiers** : `diffUtils.ts`, `proposalsView.ts`, `proposalsView.css`, `PHASE3_TOOL_CONTROL.md`, `PHASE3_QUICKSTART.md`.
- **Fichiers modifiés** : `chatService.ts`, `chatServiceImpl.ts`, `vibeCodingView.ts`, `pairProgramming.ts`.

### 3.2 Fonctionnalités attendues
- [ ] Visualisation des diffs ligne par ligne avec filtres.
- [ ] Contrôles Accept/Reject (global, fichier, ligne).
- [ ] Journalisation audit (historique 200 entrées).
- [ ] Bouton Stop génération IA et évènements `onDidCreateProposal`, `onDidChangeProposalStatus`.

---

## Phase 4 – Préparation release (Sprints 49-50 • 24 novembre - 5 décembre 2025)

### 4.1 Release management
- [ ] Release notes complètes (fonctionnalités, breaking changes, migrations).
- [ ] Tableaux de bord de monitoring (temps réel + hebdomadaire).
- [ ] Backlog post-lancement structuré (Hotfix, Améliorations, R&D).

### 4.2 Suivi qualitatif
- [ ] Co-analyse hebdomadaire avec l'équipe support.
- [ ] Enrichissement de la base de connaissances (retours terrain).
- [ ] Centralisation des insights préparant la Phase 5 (2026).

---

## Backlog stratégique 2026
- [ ] Intégration fine avec extensions partenaires (VS Marketplace).
- [ ] Mode hors ligne avec cache des connaissances locales.
- [ ] Personnalisation avancée des prompts (profils par projet).
- [ ] Observabilité produit (corrélation logs front/back + IA).
