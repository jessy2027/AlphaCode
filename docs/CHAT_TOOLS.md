# Chat Tools - Agent Capabilities

AlphaCode AI dispose maintenant d'un système d'outils (tools) qui lui permet d'agir comme un agent autonome, similaire à GitHub Copilot. Le LLM peut appeler ces outils pour effectuer des actions concrètes dans votre workspace.

## Architecture

### Composants principaux

1. **`chatService.ts`** - Définit les interfaces pour les outils et les appels d'outils
2. **`chatTools.ts`** - Implémente le registre des outils disponibles
3. **`chatServiceImpl.ts`** - Intègre les outils dans le service de chat et gère l'exécution

### Flux d'exécution

1. L'utilisateur envoie un message au chat
2. Le système prompt inclut la liste des outils disponibles
3. Le LLM répond avec du texte et/ou des appels d'outils
4. Les appels d'outils sont détectés et exécutés automatiquement
5. Les résultats sont ajoutés à la conversation
6. Le LLM continue avec les résultats des outils

## Outils disponibles

### 1. `read_file`
Lit le contenu d'un fichier.

**Paramètres:**
- `path` (string, requis) - Chemin absolu ou relatif du fichier

**Exemple d'utilisation par le LLM:**
```tool
{
  "name": "read_file",
  "parameters": {
    "path": "src/main.ts"
  }
}
```

### 2. `list_directory`
Liste tous les fichiers et dossiers dans un répertoire.

**Paramètres:**
- `path` (string, requis) - Chemin du répertoire

**Exemple:**
```tool
{
  "name": "list_directory",
  "parameters": {
    "path": "src/components"
  }
}
```

### 3. `search_files`
Recherche des fichiers par pattern (glob).

**Paramètres:**
- `pattern` (string, requis) - Pattern de recherche (ex: "*.ts", "test*.js")
- `maxResults` (number, optionnel) - Nombre max de résultats (défaut: 50)

**Exemple:**
```tool
{
  "name": "search_files",
  "parameters": {
    "pattern": "*.test.ts",
    "maxResults": 20
  }
}
```

### 4. `write_file`
Crée un nouveau fichier ou écrase un fichier existant.

**Paramètres:**
- `path` (string, requis) - Chemin du fichier
- `content` (string, requis) - Contenu à écrire

**Exemple:**
```tool
{
  "name": "write_file",
  "parameters": {
    "path": "src/newFile.ts",
    "content": "export const hello = 'world';"
  }
}
```

### 5. `edit_file`
Édite un fichier en remplaçant du texte spécifique.

**Paramètres:**
- `path` (string, requis) - Chemin du fichier
- `oldText` (string, requis) - Texte exact à remplacer
- `newText` (string, requis) - Nouveau texte

**Exemple:**
```tool
{
  "name": "edit_file",
  "parameters": {
    "path": "src/config.ts",
    "oldText": "const DEBUG = false;",
    "newText": "const DEBUG = true;"
  }
}
```

### 6. `get_file_info`
Obtient les métadonnées d'un fichier ou dossier.

**Paramètres:**
- `path` (string, requis) - Chemin du fichier/dossier

**Exemple:**
```tool
{
  "name": "get_file_info",
  "parameters": {
    "path": "package.json"
  }
}
```

### 7. `delete_file`
Supprime un fichier ou dossier.

**Paramètres:**
- `path` (string, requis) - Chemin à supprimer
- `recursive` (boolean, optionnel) - Supprimer récursivement (défaut: false)

**Exemple:**
```tool
{
  "name": "delete_file",
  "parameters": {
    "path": "temp/cache",
    "recursive": true
  }
}
```

## Comment le LLM utilise les outils

Le LLM reçoit dans son prompt système la liste complète des outils disponibles avec leurs descriptions et paramètres. Quand il veut utiliser un outil, il répond avec un bloc de code spécial:

```tool
{
  "name": "nom_de_l_outil",
  "parameters": {
    "param1": "valeur1",
    "param2": "valeur2"
  }
}
```

Le système détecte automatiquement ces blocs, extrait les appels d'outils, les exécute, et ajoute les résultats à la conversation.

## Exemples de scénarios

### Scénario 1: Analyser un projet
**Utilisateur:** "Peux-tu me donner un aperçu de la structure du projet?"

**LLM:** "Je vais explorer la structure du projet."
```tool
{
  "name": "list_directory",
  "parameters": {
    "path": "."
  }
}
```

### Scénario 2: Créer un nouveau composant
**Utilisateur:** "Crée un composant Button en React"

**LLM:** "Je vais créer un composant Button pour vous."
```tool
{
  "name": "write_file",
  "parameters": {
    "path": "src/components/Button.tsx",
    "content": "import React from 'react';\n\nexport const Button = ({ children, onClick }) => {\n  return <button onClick={onClick}>{children}</button>;\n};"
  }
}
```

### Scénario 3: Déboguer un fichier
**Utilisateur:** "Il y a un bug dans main.ts, peux-tu regarder?"

**LLM:** "Laissez-moi lire le fichier."
```tool
{
  "name": "read_file",
  "parameters": {
    "path": "src/main.ts"
  }
}
```

## Ajouter de nouveaux outils

Pour ajouter un nouvel outil, modifiez `chatTools.ts` dans la méthode `registerDefaultTools()`:

```typescript
this.registerTool({
  name: 'mon_outil',
  description: 'Description de ce que fait l\'outil',
  parameters: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'Description du paramètre'
      }
    },
    required: ['param1']
  },
  execute: async (params: { param1: string }) => {
    // Implémentation de l'outil
    return 'Résultat de l\'exécution';
  }
});
```

## Sécurité

- Les chemins relatifs sont résolus par rapport au workspace
- Les secrets sont masqués avant d'être envoyés au LLM
- Les erreurs d'exécution sont capturées et retournées comme résultats d'outils
- Les outils destructifs (delete_file) nécessitent une confirmation

## Limitations actuelles

- Maximum 50 résultats pour la recherche de fichiers
- Les outils sont exécutés séquentiellement
- Pas de parallélisation des appels d'outils
- Le LLM doit utiliser le format exact pour les appels d'outils

## Prochaines améliorations

- [ ] Support de l'exécution parallèle des outils
- [ ] Outils pour exécuter des commandes shell
- [ ] Outils pour interagir avec Git
- [ ] Outils pour analyser le code (AST)
- [ ] Cache des résultats d'outils
- [ ] Confirmation utilisateur pour les actions destructives
