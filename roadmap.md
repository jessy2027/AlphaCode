# Roadmap AlphaCode

## Phase 1 – Stabilisation de l'autocomplétion (Semaine 1)
- **Objectif** Garantir l'affichage du ghost text lors de l'autocomplétion dans le terminal comme dans les éditeurs de fichiers.
- **Tâches clés**
  - Auditer la chaîne de rendu du ghost text pour les contextes terminal et éditeur, identifier les divergences de comportement.
  - Corriger le flux d'événements d'affichage du menu déroulant afin que le ghost text reste visible lorsque la liste des suggestions est ouverte.
  - Ajouter des tests automatisés (UI et unitaires) couvrant l'affichage simultané menu déroulant + ghost text.
  - Vérifier les régressions potentielles sur les thèmes clairs/sombres et modes haute accessibilité.
- **Livrables**
  - Ghost text fonctionnel avec menu déroulant dans le terminal et les fichiers.
  - Jeux de tests mis à jour et documentés.
- **Mesure de succès** Retour positif du QA interne et absence de régressions dans les tests automatisés.

## Phase 2 – Améliorations du chat AlphaCode (Semaines 2 à 5)

### 2.1 Ajout d'un système d'attache de fichiers (Semaines 2-3)
- **Objectif** Permettre aux utilisateurs d'envoyer un ou plusieurs fichiers au sein d'une conversation.
- **Tâches clés**
  - Concevoir l'UI/UX d'ajout de pièces jointes et la gestion des types supportés.
  - Implémenter l'upload sécurisé (limites de taille, antivirus, chiffrement en transit).
  - Adapter l'API backend pour stocker et servir les fichiers, avec métadonnées.
  - Ajouter des validations et messages d'erreur clairs côté client.
- **Livrables** Interface d'attache fonctionnelle, stockage sécurisé et documentation d'usage.

### 2.2 Édition des réponses dans le chat (Semaine 3)
- **Objectif** Autoriser l'utilisateur (ou l'IA sous contrôle) à modifier un message déjà envoyé.
- **Tâches clés**
  - Définir les règles d'édition (historique, horodatage, permissions).
  - Mettre à jour l'UI pour basculer un message en mode édition et sauvegarder les modifications.
  - Assurer la propagation côté serveur avec versioning pour conserver les anciennes versions.
- **Livrables** Messages éditables avec traçabilité des modifications.

### 2.3 Gestion multi-conversations et reprise (Semaines 3-4)
- **Objectif** Créer, nommer, enregistrer et rouvrir plusieurs conversations.
- **Tâches clés**
  - Concevoir une vue de gestion des conversations (liste, recherche, filtres).
  - Implémenter la persistance (stockage local + synchronisation serveur si disponible).
  - Ajouter la possibilité de dupliquer, archiver et restaurer une conversation.
  - Prévoir des points d'entrée pour réécrire ou rejouer des segments de conversation.
- **Livrables** Gestionnaire de conversations complet avec fonctionnalités de reprise.

### 2.4 Réinjection et modification de messages existants (Semaine 4)
- **Objectif** Permettre de replacer un message précédent dans le flux pour le modifier ou relancer une tâche.
- **Tâches clés**
  - Ajouter des actions UI contextualisées ("Réutiliser", "Modifier et renvoyer").
  - Garantir la cohérence du contexte IA lors de la réinjection.
  - Mettre à jour les logs et journaux d'audit pour suivre les modifications.
- **Livrables** Flux de reprise de message opérationnel et robuste.

### 2.5 QA et documentation (Semaine 5)
- **Objectif** Valider l'ensemble des nouvelles fonctionnalités chat et documenter leur usage.
- **Tâches clés**
  - Campagne de tests exploratoires et automatisés couvrant les cas critiques.
  - Rédaction de guides utilisateur et notes de version.
- **Livrables** Rapport QA, documentation et checklist de régression.

## Phase 3 – Contrôle des actions outils IA (Semaines 6-7)
- **Objectif** Afficher la différence proposée par l'IA lorsqu'elle utilise un outil (ex. modification de fichier) et offrir la possibilité d'accepter ou refuser la modification.
- **Tâches clés**
  - Instrumenter la capture des diffs générés par les outils IA.
  - Développer un composant UI de visualisation des diffs avec options d'acceptation/annulation.
  - Intégrer des hooks d'approbation dans le pipeline d'exécution des outils.
  - Ajouter une journalisation des décisions (accepté/refusé) pour audit.
- **Livrables** Workflow de validation des diffs IA disponible dans toutes les conversations.
- **Mesure de succès** Adoption par les bêta testeurs et réduction des erreurs introduites par l'IA.

## Phase 4 – Déploiement et suivi (Semaines 8-9)
- **Objectif** Mettre en production progressive les nouveautés et surveiller leur impact.
- **Tâches clés**
  - Déployer en canary puis en généralisation, avec métriques d'usage et de stabilité.
  - Mettre en place des alertes pour détection de régressions (ghost text, chat, outils IA).
  - Collecter les retours utilisateurs et identifier les améliorations post-lancement.
- **Livrables** Release notes complètes, tableaux de bord de suivi et backlog post-lancement.
