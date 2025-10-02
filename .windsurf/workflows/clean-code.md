---
description: clean code
auto_execution_mode: 1
---

# 🧹 Workflow Windsurf – Nettoyage de Code Sans Perte Fonctionnelle

## 🎯 Objectif
Nettoyer le projet afin de :
- Supprimer les variables, fonctions et imports inutilisés.
- Supprimer les commentaires redondants ou obsolètes.
- Ajouter des commentaires pertinents uniquement lorsque cela améliore la lisibilité.
- Réduire le bruit dans le code **sans modifier la logique ou le comportement**.

---

## ⚙️ Étapes de Nettoyage

### 1. Préparation
- Identifier les dossiers à nettoyer (`src/`, `app/`, etc.).
- Exclure les fichiers critiques de configuration (ex: `.env`, `package.json`, migrations DB).
- S’assurer que l’application compile et passe les tests avant nettoyage.

### 2. Suppression du superflu
- **Imports inutilisés** : supprimer les imports qui ne sont jamais appelés.
- **Variables inutilisées** : détecter et retirer les variables, constantes ou fonctions déclarées mais non utilisées.
- **Commentaires inutiles** :
  - Supprimer les commentaires auto-générés vides de sens (ex: `// TODO auto-generated`).
  - Supprimer les logs/commentaires de debug (`console.log("test")`, `// debug`, etc.).

### 3. Ajout de clarté
- Ajouter des **commentaires utiles uniquement** :
  - Explications de fonctions complexes.
  - Documentation rapide des classes/méthodes.
  - Contexte sur les choix techniques si cela aide un futur dev.

### 4. Vérification de cohérence
- Vérifier la cohérence du formatage (indentation, espaces, style).
- Vérifier que **chaque fichier compilé/testé fonctionne exactement comme avant**.
- Vérifier que l’IA **ne change aucune logique métier** (les signatures et appels doivent rester identiques).

---

## 🔍 Validation
1. Relancer les tests unitaires/CI → **doivent être 100% identiques**.
2. Comparer `git diff` :
   - Seules différences acceptées : suppressions d’imports/variables/commentaires ou ajout de commentaires pertinents.
   - Aucune modification du code exécutable.

---

## 🚀 Commande de Lancement (Prompt pour Windsurf)

> Nettoie le code du projet en suivant strictement ces règles :
> - Supprime uniquement : imports inutilisés, variables/fonctions non utilisées, commentaires inutiles.
> - Ajoute uniquement : commentaires utiles expliquant les parties complexes.
> - N’altère jamais la logique métier ni les signatures de fonctions.
> - Le comportement de l’application doit rester strictement identique.
> - Respecte le formatage et la cohérence du style de projet.
> - Vérifie à la fin que tout compile et que les tests passent.

---

✅ Résultat attendu : un code **plus léger, plus lisible et plus documenté**, sans aucune altération de son comportement.
