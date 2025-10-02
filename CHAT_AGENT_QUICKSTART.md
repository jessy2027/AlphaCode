# Guide rapide - Agent AlphaCode Chat

## 🚀 Démarrage rapide

AlphaCode Chat est maintenant un **agent autonome** capable d'effectuer des actions dans votre workspace!

### Que peut faire l'agent?

✅ **Lire des fichiers** - "Lis le fichier src/main.ts"  
✅ **Lister des dossiers** - "Montre-moi ce qu'il y a dans src/"  
✅ **Chercher des fichiers** - "Trouve tous les fichiers .test.ts"  
✅ **Créer des fichiers** - "Crée un composant Button en React"  
✅ **Éditer des fichiers** - "Remplace la fonction init() dans config.ts"  
✅ **Obtenir des infos** - "Quelle est la taille de package.json?"  
✅ **Supprimer des fichiers** - "Supprime le dossier temp/"  

## 📝 Exemples d'utilisation

### 1. Explorer votre projet
```
Vous: "Montre-moi la structure du dossier src"
```
L'agent va lister tous les fichiers et dossiers.

### 2. Analyser du code
```
Vous: "Lis le fichier main.ts et explique ce qu'il fait"
```
L'agent va lire le fichier et l'analyser.

### 3. Créer du code
```
Vous: "Crée un fichier utils/helpers.ts avec des fonctions utilitaires"
```
L'agent va créer le fichier avec du code approprié.

### 4. Modifier du code
```
Vous: "Dans config.ts, change DEBUG de false à true"
```
L'agent va éditer le fichier précisément.

### 5. Rechercher dans le projet
```
Vous: "Trouve tous les fichiers de test"
```
L'agent va chercher les fichiers correspondants.

## 🎯 Commandes utiles

| Ce que vous voulez | Exemple de commande |
|-------------------|---------------------|
| Lire un fichier | "Lis le fichier X" |
| Lister un dossier | "Liste le contenu de X" |
| Créer un fichier | "Crée un fichier X avec Y" |
| Éditer un fichier | "Dans X, remplace A par B" |
| Chercher des fichiers | "Trouve tous les fichiers *.ts" |
| Analyser le code | "Analyse le fichier X et trouve les bugs" |
| Créer des tests | "Crée des tests pour le composant X" |
| Refactorer | "Refactorise la fonction X dans Y" |

## 💡 Conseils

### ✅ Bonnes pratiques

1. **Soyez spécifique** avec les chemins de fichiers
   - ✅ "Lis src/components/Button.tsx"
   - ❌ "Lis le bouton"

2. **Donnez du contexte** pour les modifications
   - ✅ "Dans config.ts, change la ligne 10 où DEBUG = false"
   - ❌ "Change le debug"

3. **Vérifiez les actions** avant de continuer
   - Lisez les modifications proposées
   - Confirmez que c'est ce que vous voulez

4. **Utilisez des étapes** pour les tâches complexes
   - "D'abord, lis le fichier X"
   - "Maintenant, crée un test basé sur ce code"

### ❌ À éviter

- Commandes vagues: "Fais quelque chose avec le code"
- Chemins ambigus: "Le fichier dans components"
- Actions destructives sans vérification: "Supprime tout"

## 🔧 Outils disponibles

L'agent a accès à 7 outils:

1. **read_file** - Lit le contenu d'un fichier
2. **list_directory** - Liste les fichiers d'un dossier
3. **search_files** - Cherche des fichiers par pattern
4. **write_file** - Crée ou écrase un fichier
5. **edit_file** - Édite un fichier existant
6. **get_file_info** - Obtient les métadonnées d'un fichier
7. **delete_file** - Supprime un fichier ou dossier

## 🎬 Scénarios d'utilisation

### Scénario 1: Déboguer un problème

```
Vous: "J'ai une erreur dans app.ts, peux-tu regarder?"
Agent: [Lit app.ts]
Agent: "Je vois le problème ligne 45, voici la correction..."
Vous: "Applique la correction"
Agent: [Édite app.ts]
```

### Scénario 2: Créer une nouvelle fonctionnalité

```
Vous: "Crée un composant Modal en React avec TypeScript"
Agent: [Crée Modal.tsx]
Vous: "Maintenant crée les tests pour ce composant"
Agent: [Lit Modal.tsx puis crée Modal.test.tsx]
```

### Scénario 3: Refactoring

```
Vous: "Trouve tous les fichiers qui utilisent l'ancienne API"
Agent: [Cherche les fichiers]
Agent: "J'ai trouvé 5 fichiers: ..."
Vous: "Mets à jour le premier fichier"
Agent: [Lit et édite le fichier]
```

## 🔒 Sécurité

- ✅ Les secrets sont automatiquement masqués
- ✅ Les chemins sont validés
- ✅ Les erreurs sont capturées
- ⚠️ Vérifiez toujours les actions destructives (suppression)

## 📚 Documentation complète

- **Guide détaillé**: `docs/CHAT_TOOLS.md`
- **Exemples complets**: `docs/CHAT_TOOLS_EXAMPLES.md`
- **Documentation technique**: `CHAT_AGENT_IMPLEMENTATION.md`

## 🐛 Problèmes courants

### L'agent ne trouve pas un fichier
- Vérifiez le chemin (relatif au workspace)
- Utilisez des chemins complets: `src/components/Button.tsx`

### L'édition échoue
- Le texte à remplacer doit correspondre exactement
- Incluez les espaces et retours à la ligne

### L'agent ne répond pas
- Vérifiez votre connexion au provider AI
- Consultez la console pour les erreurs

## 🚀 Prochaines étapes

Essayez ces commandes pour commencer:

1. `"Liste les fichiers dans src/"`
2. `"Lis le fichier package.json"`
3. `"Trouve tous les fichiers TypeScript"`
4. `"Crée un fichier test.ts avec une fonction hello()"`

## 💬 Feedback

L'agent apprend de vos interactions. Plus vous l'utilisez, mieux il comprend vos besoins!

**Amusez-vous bien avec votre nouvel assistant de code! 🎉**
