# Roadmap AlphaCode

## Vue d'ensemble
- **Périmètre** : Optimisation UX différences, chat temps réel, multi-conversations, contrôle outils IA, déploiement sécurisé
- **Horizon** : Semaines 1-9, synchronisation par phase
- **KPI** : Satisfaction UX diffs, réactivité chat, taux acceptation IA, stabilité production

---

## 🔴 Priorités Critiques (Semaine 1)

### P1 - Amélioration système de différences
- **Problème** : Fichiers proposés non enregistrés, requiert fermeture manuelle, ouvre fichiers dans un reperoitre bizard
- **Solution** : Application immédiate des modifications au fichier actuel, rollback si refus
- **Livrables**
  - [ ] Appliquer modifications instantanément au fichier ouvert avant validation
  - [ ] Implémenter mécanisme rollback complet si refus utilisateur
  - [ ] Supprimer comportement d'ouverture bizard de fichiers
  - [ ] Marquer fichier comme sauvegardé après acceptation (suprimer les diff visuelement)

### P2 - Amélioration réactivité chat et outils
- **Problème** : Absence de feedback visuel pendant génération outils
- **Solution** : Chargement dynamique + exécution immédiate post-génération
- **Livrables**
  - [ ] Détecter élément "```tool" en temps réel pendant génération IA
  - [ ] Afficher indicateur de chargement dynamique immédiatement : thinking... ; loading... etc
  - [ ] Appliquer mise en page "Outils" dès fin d'écriture
  - [ ] Exécuter automatiquement l'outil dès génération complète

---

## Phase 2 – Chat AlphaCode (Semaines 2 à 5)

### 2.1 Système d'attache de fichiers (S2-3)
- **Livrables**
  - [ ] UI d'ajout de pièces jointes avec types supportés
  - [ ] Upload sécurisé (taille, validation, chiffrement)
  - [ ] API backend : stockage et métadonnées
  - [ ] Validation et gestion erreurs client

### 2.2 Multi-conversations et reprise ✅ (S3-4)
- **Livrables**
  - [ ] Vue gestion : liste, recherche, filtres
  - [ ] Persistance locale + sync serveur optionnelle
  - [ ] Dupliquer, archiver, restaurer conversations
  - [ ] Rejeu de segments conversationnels

### 2.3 Rollback conversationnel (S4)
- **Livrables**
  - [ ] Bouton rollback sur chaque message (supprimer modifications ultérieures)
  - [ ] Modification message post-rollback possible
  - [ ] Préservation cohérence contexte IA
  - [ ] Logs audit complets

### 2.4 QA et documentation (S5)
- **Livrables**
  - [ ] Tests exploratoires + automatisés (cas critiques)
  - [ ] Guides utilisateur et release notes
  - [ ] Checklist régression à jour

### 2.5 Résilience contexte IA (S5)
- **Livrables**
  - [ ] Résumé automatique échanges (anti-dérive)
  - [ ] Visualisation contexte actif (messages épinglés)
  - [ ] Détection pertes de contexte (logs techniques)
  - [ ] Restauration rapide après reconnexion

### 2.6 Feedback et instrumentation (S5-6)
- **Livrables**
  - [ ] Notation rapide (👍/👎 + commentaire) par réponse
  - [ ] Tracking feedback/conversation/version modèle
  - [ ] Alertes baisse satisfaction
  - [ ] Rapport synthétique hebdomadaire

---

## Phase 3 – Contrôle outils IA (Semaines 6-7)

### 3.1 Fichiers impactés
**Nouveaux**
- `diffUtils.ts`, `proposalsView.ts`, `proposalsView.css`
- `PHASE3_TOOL_CONTROL.md`, `PHASE3_QUICKSTART.md`

**Modifiés**
- `chatService.ts`, `chatServiceImpl.ts`, `vibeCodingView.ts`, `pairProgramming.ts`

### 3.2 Fonctionnalités
- Visualisation diffs ligne par ligne
- Contrôle Accept/Reject (All/Fichier/Ligne)
- Journalisation audit (200 entrées)
- Bouton Stop génération IA
- Events : `onDidCreateProposal`, `onDidChangeProposalStatus`

---

## Phase 4 – Déploiement production (Semaines 8-9)

### 4.1 Release
- [ ] Release notes complètes
- [ ] Tableaux de bord monitoring
- [ ] Backlog post-lancement

### 4.2 Suivi qualitatif
- [ ] Co-analyse hebdomadaire équipe support
- [ ] Enrichissement documentation retours terrain
- [ ] Centralisation insights pour Phase 5
