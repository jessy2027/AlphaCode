---
description: clean css
auto_execution_mode: 1
---

# 🎨 Workflow Windsurf – Nettoyage CSS Sans Perte Visuelle

## 🎯 Objectif
Nettoyer le CSS afin de :
- Supprimer les classes, IDs, animations, et media queries non utilisés.
- Supprimer les commentaires inutiles ou obsolètes.
- Ajouter des commentaires pertinents uniquement lorsqu’ils expliquent un choix CSS complexe.
- Garder **strictement la même apparence visuelle** de l’application.

---

## ⚙️ Étapes de Nettoyage

### 1. Préparation
- Identifier tous les fichiers CSS/SCSS/PostCSS (`/styles`, `/src/**/*.css`, etc.).
- Scanner l’ensemble du projet (HTML, JSX/TSX, templates) pour savoir quelles classes/IDs sont réellement utilisés.
- Exclure les styles globaux critiques (reset.css, tailwind.css, bootstrap.css, etc. si utilisés).

### 2. Suppression du superflu
- **Classes et IDs inutilisés** : supprimer les sélecteurs jamais appelés dans le code source.
- **Animations inutilisées** : retirer les `@keyframes` non référencés.
- **Media queries inutiles** : retirer celles qui ne contiennent que du code mort.
- **Commentaires inutiles** :
  - Supprimer les commentaires auto-générés ou banals (`/* style */`).
  - Supprimer les notes de debug ou temporaires.

### 3. Ajout de clarté
- Ajouter des **commentaires utiles uniquement** :
  - Expliquer des hacks CSS nécessaires (compatibilité navigateur).
  - Justifier des règles complexes (`z-index`, grilles, fallback).
  - Décrire la structure logique si besoin (layout principal, typographie, etc.).

### 4. Vérification de cohérence
- Vérifier qu’aucune suppression ne casse l’affichage.
- Comparer le rendu visuel avant/après (screenshots ou test manuel).
- Vérifier que les fichiers CSS respectent les conventions de formatage (indentation, ordre des propriétés, etc.).

---

## 🔍 Validation
1. Lancer l’application et vérifier visuellement les pages principales.
2. Comparer `git diff` :
   - Seules différences acceptées : suppressions de classes/IDs inutilisés, animations mortes, commentaires inutiles.
   - Ajout de commentaires explicatifs acceptés.
   - Aucune différence visuelle tolérée.

---

## 🚀 Commande de Lancement (Prompt pour Windsurf)

> Nettoie les fichiers CSS/SCSS en suivant strictement ces règles :
> - Supprime uniquement : classes, IDs, animations et media queries **non utilisés** dans le projet.
> - Supprime uniquement les commentaires inutiles.
> - Ajoute uniquement des commentaires explicatifs pour les parties complexes ou critiques.
> - Ne change jamais l’apparence visuelle finale du site.
> - Respecte le formatage, l’ordre des propriétés et le style du projet.
> - Vérifie que le rendu reste identique après nettoyage.

---

✅ Résultat attendu : un CSS **plus léger, plus lisible et plus cohérent**, avec un rendu visuel identique.
