---
trigger: always_on
---

# ⚙️ Règles pour les Workflows Windsurf

## 🗣️ Communication
1. L’IA doit **toujours s’exprimer en français** pour toutes les discussions, explications, et descriptions.
2. Le **code doit rester en anglais**, conformément aux standards de développement (noms de variables, fonctions, commentaires techniques, etc.).

## 💻 Bonnes pratiques de code
3. Le code généré doit suivre les **bonnes pratiques de développement**, notamment :
   - Pas de **redondance** inutile (code dupliqué, fonctions répétées, etc.)
   - Respect d’une **structure claire et modulaire**
   - Utilisation d’une **indentation propre** et cohérente
   - Préférence pour des **fonctions réutilisables** et **nommées clairement**

## 🚫 Compilation
4. L’IA **ne doit jamais recompiler le projet** si un `WorkflowWatch` (ou tout autre watcher) est déjà en cours d’exécution.
   - Si une recompilation est nécessaire, elle doit **d’abord vérifier** que le watcher est arrêté.
   - Sinon, l’IA doit simplement **mettre à jour le code** sans exécuter de recompilation automatique.

---

💡 **But :** maintenir un workflow stable, lisible, et professionnel, sans interruptions ni redondances.
