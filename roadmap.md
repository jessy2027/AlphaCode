# Roadmap AlphaCode

## Vue d'ensemble
- **Périmètre** Stabiliser l'autocomplétion, enrichir le chat AlphaCode, contrôler les actions outils IA et déployer en production sécurisée.
- **Horizon** Semaine 1 à Semaine 9, avec point de synchronisation à chaque fin de phase.
- **KPI clés** Taux de succès du ghost text, satisfaction utilisateur chat, taux d'acceptation des diffs IA, stabilité post-déploiement.


## Phase 2 – Améliorations du chat AlphaCode (Semaines 2 à 5)

### 2.1 Ajout d'un système d'attache de fichiers (Semaines 2-3)
- **Objectif** Permettre aux utilisateurs d'envoyer un ou plusieurs fichiers au sein d'une conversation.
- **Livrables** Interface d'attache fonctionnelle, stockage sécurisé et documentation d'usage.
- **TODO**
  - [ ] Concevoir l'UI/UX d'ajout de pièces jointes et la gestion des types supportés.
  - [ ] Implémenter l'upload sécurisé et d'embeding (limites de taille, antivirus, chiffrement en transit).
  - [ ] Adapter l'API backend pour stocker et servir les fichiers, avec métadonnées.
  - [ ] Ajouter des validations et messages d'erreur clairs côté client.

### 2.2 Édition des réponses dans le chat (Semaine 3)
- **Objectif** Autoriser l'utilisateur (ou l'IA sous contrôle) à modifier un message déjà envoyé.
- **Livrables** Messages éditables avec traçabilité des modifications.
- **TODO**
  - [ ] Définir les règles d'édition (historique, horodatage, permissions).
  - [ ] Mettre à jour l'UI pour basculer un message en mode édition et sauvegarder les modifications.
  - [ ] Assurer la propagation côté serveur avec versioning pour conserver les anciennes versions.

### 2.3 Gestion multi-conversations et reprise (Semaines 3-4)
- **Objectif** Créer, nommer, enregistrer et rouvrir plusieurs conversations.
- **Livrables** Gestionnaire de conversations complet avec fonctionnalités de reprise.
- **TODO**
  - [ ] Concevoir une vue de gestion des conversations (liste, recherche, filtres).
  - [ ] Implémenter la persistance (stockage local + synchronisation serveur si disponible).
  - [ ] Ajouter la possibilité de dupliquer, archiver et restaurer une conversation.
  - [ ] Prévoir des points d'entrée pour réécrire ou rejouer des segments de conversation.

### 2.4 Réinjection et modification de messages existants (Semaine 4)
- **Objectif** Permettre de replacer un message précédent dans le flux pour le modifier ou relancer une tâche.
- **Livrables** Flux de reprise de message opérationnel et robuste.
- **TODO**
  - [ ] Ajouter des actions UI contextualisées ("Réutiliser", "Modifier et renvoyer").
  - [ ] Garantir la cohérence du contexte IA lors de la réinjection.
  - [ ] Mettre à jour les logs et journaux d'audit pour suivre les modifications.

### 2.5 QA et documentation (Semaine 5)
- **Objectif** Valider l'ensemble des nouvelles fonctionnalités chat et documenter leur usage.
- **Livrables** Rapport QA, documentation et checklist de régression.
- **TODO**
  - [ ] Conduire une campagne de tests exploratoires et automatisés couvrant les cas critiques.
  - [ ] Rédiger les guides utilisateur et notes de version.
  - [ ] Mettre à jour la checklist de régression et la partager avec l'équipe QA.

### 2.6 Résilience conversationnelle et gestion du contexte (Semaine 5)
- **Objectif** Assurer la continuité des conversations longues en préservant la pertinence des réponses de l'IA.
- **Livrables** Mécanisme de résumé dynamique, gestion des métadonnées de conversation et outils de diagnostic.
- **TODO**
  - [ ] Implémenter un système de résumé automatique des échanges pour limiter la dérive du contexte.
  - [ ] Ajouter une visualisation du contexte actif côté utilisateur (messages épinglés, rappel des objectifs).
  - [ ] Détecter et signaler les pertes de contexte ou les incohérences de l'IA dans les journaux techniques.
  - [ ] Fournir un service de restauration rapide du contexte après reconnexion ou rechargement.

### 2.7 Feedback utilisateur et instrumentation (Semaines 5-6)
- **Objectif** Mesurer la qualité perçue du chat et accélérer l'itération produit.
- **Livrables** Tableau de bord feedback, métriques produit et canal de collecte en continu.
- **TODO**
  - [ ] Intégrer un système de notation rapide (👍/👎 + commentaire) sur chaque réponse IA.
  - [ ] Relier les feedbacks aux conversations et aux versions du modèle pour faciliter l'analyse.
  - [ ] Mettre en place des alertes en cas de baisse de satisfaction ou d'augmentation des refus de diff IA.
  - [ ] Publier un rapport synthétique hebdomadaire incluant suggestions utilisateur et tendances clés.

### Fichiers créés/modifiés

#### Nouveaux fichiers
- `src/vs/workbench/contrib/alphacode/browser/diffUtils.ts` - Utilitaires de calcul de diffs
- `src/vs/workbench/contrib/alphacode/browser/proposalsView.ts` - Vue UI des proposals
- `src/vs/workbench/contrib/alphacode/browser/media/proposalsView.css` - Styles
- `PHASE3_TOOL_CONTROL.md` - Documentation complète
- `PHASE3_QUICKSTART.md` - Guide de démarrage rapide

#### Fichiers modifiés
- `src/vs/workbench/contrib/alphacode/common/chatService.ts` - Interfaces étendues
- `src/vs/workbench/contrib/alphacode/browser/chatServiceImpl.ts` - Logique de gestion
- `src/vs/workbench/contrib/alphacode/browser/vibeCodingView.ts` - Intégration UI
- `src/vs/workbench/contrib/alphacode/common/pairProgramming.ts` - Extension copilote

### Fonctionnalités clés
1. **Visualisation des diffs** : Calcul automatique et affichage des changements ligne par ligne
2. **Contrôle multi-niveaux** : Accept/Reject All, par fichier, ou par ligne
3. **Ouverture automatique** : Les diffs s'ouvrent automatiquement dans l'éditeur
4. **Journalisation** : Audit complet de toutes les décisions (200 dernières entrées)
5. **Bouton Stop** : Arrêt immédiat de la génération IA en cours
6. **Events réactifs** : `onDidCreateProposal`, `onDidChangeProposalStatus`
7. **API complète** : Méthodes pour toutes les opérations de gestion

### Documentation
- Guide utilisateur : `PHASE3_QUICKSTART.md`
- Documentation technique : `PHASE3_TOOL_CONTROL.md`
- Exemples d'utilisation avec captures UI
- API complète et événements

## Phase 4 – Déploiement et suivi (Semaines 8-9)
- **Objectif** Mettre en production progressive les nouveautés et surveiller leur impact.
- **Livrables** Release notes complètes, tableaux de bord de suivi et backlog post-lancement.

- **Suivi qualitatif**
  - [ ] Organiser des sessions de co-analyse hebdomadaires avec l'équipe support pour identifier les frictions.
  - [ ] Enrichir `PHASE3_TOOL_CONTROL.md` avec des retours terrain et scénarios d'usage critiques.
  - [ ] Centraliser les insights du feedback chat pour alimenter la Phase 5 (expérience conversationnelle continue).

### ✅ Bouton stop pour le chat - IMPLÉMENTÉ
- Le bouton d'envoi (↑) se transforme en bouton stop (⏸) pendant que l'IA génère une réponse
- Fond rouge en mode stop pour une meilleure visibilité
- Fonctionnalité `stopStreaming()` pour arrêter la génération en cours

- **TODO**
  - [ ] Déployer en canary puis en généralisation, avec métriques d'usage et de stabilité.
  - [ ] Mettre en place des alertes pour détection de régressions (ghost text, chat, outils IA).
  - [ ] Collecter les retours utilisateurs et identifier les améliorations post-lancement.
  - [ ] Prioriser et planifier les actions du backlog post-lancement.
  - [ ] Créer les release notes pour la Phase 3 (contrôle des outils IA).
  - [ ] Former les utilisateurs bêta aux nouvelles fonctionnalités.
