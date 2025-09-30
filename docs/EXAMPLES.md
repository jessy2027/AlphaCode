# AlphaCodeIDE - Exemples d'Utilisation

## 🎯 Configuration Initiale

### Configuration OpenAI
```json
{
  "alphacode.ai.provider": "openai",
  "alphacode.ai.apiKey": "sk-...",
  "alphacode.ai.model": "gpt-4",
  "alphacode.ai.temperature": 0.7,
  "alphacode.ai.maxTokens": 2048
}
```

### Configuration Claude (Recommandé)
```json
{
  "alphacode.ai.provider": "anthropic",
  "alphacode.ai.apiKey": "sk-ant-...",
  "alphacode.ai.model": "claude-3-5-sonnet-20241022",
  "alphacode.ai.temperature": 0.7,
  "alphacode.ai.maxTokens": 4096
}
```

### Configuration Azure OpenAI
```json
{
  "alphacode.ai.provider": "azure",
  "alphacode.ai.apiKey": "your-azure-key",
  "alphacode.ai.model": "gpt-4",
  "alphacode.ai.endpoint": "https://your-resource.openai.azure.com/"
}
```

### Configuration Ollama (Local)
```json
{
  "alphacode.ai.provider": "local",
  "alphacode.ai.model": "codellama",
  "alphacode.ai.endpoint": "http://localhost:11434/v1/chat/completions",
  "alphacode.ai.apiKey": "" // optionnel pour Ollama
}
```

## 💬 Exemples de Chat

### Exemple 1: Création d'un Composant React

**Vous:**
```
Crée un composant React TypeScript pour un formulaire de login avec:
- Champs email et password
- Validation
- État de chargement
- Gestion d'erreurs
- Utilisation de hooks modernes
```

**AlphaCode AI:**
```typescript
import React, { useState, FormEvent } from 'react';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      await onSubmit(email, password);
    } catch (error) {
      setErrors({ 
        general: error instanceof Error ? error.message : 'Login failed' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      {errors.general && (
        <div className="error-banner">{errors.general}</div>
      )}

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          aria-invalid={!!errors.email}
        />
        {errors.email && <span className="error">{errors.email}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          aria-invalid={!!errors.password}
        />
        {errors.password && <span className="error">{errors.password}</span>}
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};
```

### Exemple 2: API REST avec Express

**Vous:**
```
Crée une API REST avec Express et TypeScript pour gérer des utilisateurs:
- CRUD complet
- Validation des données
- Gestion d'erreurs
- Middleware d'authentification JWT
```

**AlphaCode AI:**
```typescript
import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';

const app = express();
app.use(express.json());

// Types
interface User {
  id: string;
  email: string;
  name: string;
  password: string;
}

interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

// Mock database
const users: User[] = [];

// JWT Secret (à stocker en environnement)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware d'authentification
const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Validation middleware
const validateUser = [
  body('email').isEmail().withMessage('Invalid email'),
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
];

// Routes

// POST /users - Create user
app.post('/users', validateUser, (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, name, password } = req.body;

  if (users.find(u => u.email === email)) {
    return res.status(409).json({ error: 'Email already exists' });
  }

  const user: User = {
    id: Date.now().toString(),
    email,
    name,
    password // À hasher avec bcrypt en production!
  };

  users.push(user);

  const { password: _, ...userWithoutPassword } = user;
  res.status(201).json(userWithoutPassword);
});

// POST /login - Login
app.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

// GET /users - List users (protected)
app.get('/users', authenticate, (req: AuthRequest, res: Response) => {
  const usersWithoutPasswords = users.map(({ password, ...user }) => user);
  res.json(usersWithoutPasswords);
});

// GET /users/:id - Get user (protected)
app.get('/users/:id', authenticate, (req: AuthRequest, res: Response) => {
  const user = users.find(u => u.id === req.params.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { password, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

// PUT /users/:id - Update user (protected)
app.put('/users/:id', authenticate, validateUser, (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const index = users.findIndex(u => u.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Vérifier que l'utilisateur modifie son propre profil
  if (users[index].id !== req.user?.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  users[index] = { ...users[index], ...req.body };

  const { password, ...userWithoutPassword } = users[index];
  res.json(userWithoutPassword);
});

// DELETE /users/:id - Delete user (protected)
app.delete('/users/:id', authenticate, (req: AuthRequest, res: Response) => {
  const index = users.findIndex(u => u.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (users[index].id !== req.user?.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  users.splice(index, 1);
  res.status(204).send();
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## 🔧 Exemples d'Agents Spécialisés

### Refactor Code

**Sélectionner ce code:**
```javascript
function processData(data) {
  var result = [];
  for (var i = 0; i < data.length; i++) {
    if (data[i].active == true) {
      result.push({
        id: data[i].id,
        name: data[i].name
      });
    }
  }
  return result;
}
```

**Commande:** `AlphaCode: Refactor Selected Code`

**Résultat:**
```typescript
interface DataItem {
  id: string;
  name: string;
  active: boolean;
}

interface ProcessedItem {
  id: string;
  name: string;
}

function processData(data: DataItem[]): ProcessedItem[] {
  return data
    .filter(item => item.active)
    .map(({ id, name }) => ({ id, name }));
}
```

### Generate Documentation

**Sélectionner cette fonction:**
```typescript
async function fetchUserData(userId: string, includeOrders: boolean = false) {
  const user = await db.users.findById(userId);
  if (!user) throw new Error('User not found');
  
  if (includeOrders) {
    user.orders = await db.orders.findByUserId(userId);
  }
  
  return user;
}
```

**Commande:** `AlphaCode: Generate Documentation`

**Résultat:**
```typescript
/**
 * Fetches user data from the database by user ID
 * 
 * @param userId - The unique identifier of the user
 * @param includeOrders - Optional flag to include user orders in the response (default: false)
 * @returns Promise resolving to the user object with optional orders
 * @throws {Error} When user is not found in the database
 * 
 * @example
 * ```typescript
 * // Fetch user without orders
 * const user = await fetchUserData('user-123');
 * 
 * // Fetch user with orders
 * const userWithOrders = await fetchUserData('user-123', true);
 * ```
 */
async function fetchUserData(userId: string, includeOrders: boolean = false) {
  const user = await db.users.findById(userId);
  if (!user) throw new Error('User not found');
  
  if (includeOrders) {
    user.orders = await db.orders.findByUserId(userId);
  }
  
  return user;
}
```

### Debug Code

**Sélectionner ce code avec erreur:**
```typescript
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

const cart = [
  { name: 'Book', price: 10 },
  { name: 'Pen', price: 2, quantity: 5 }
];

console.log(calculateTotal(cart));
```

**Commande:** `AlphaCode: Debug Selected Code`

**Résultat:**
```typescript
// Problème identifié:
// 1. Le premier élément du tableau n'a pas de propriété 'quantity'
// 2. Cela cause 'undefined * 10' = NaN
// 3. Le résultat final devient NaN

// Solution:
interface CartItem {
  name: string;
  price: number;
  quantity: number;
}

function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => {
    // Utiliser quantity avec valeur par défaut de 1
    const quantity = item.quantity ?? 1;
    return sum + item.price * quantity;
  }, 0);
}

const cart: CartItem[] = [
  { name: 'Book', price: 10, quantity: 1 }, // Ajout de quantity
  { name: 'Pen', price: 2, quantity: 5 }
];

console.log(calculateTotal(cart)); // Output: 20
```

### Explain Code

**Sélectionner du code complexe:**
```typescript
const memoize = (fn) => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};
```

**Commande:** `AlphaCode: Explain Selected Code`

**Résultat:**
```
Cette fonction implémente un pattern de mémorisation (memoization) pour optimiser les performances:

1. **Objectif**: Mettre en cache les résultats d'appels de fonction coûteux

2. **Fonctionnement**:
   - Crée un cache (Map) pour stocker les résultats
   - Retourne une fonction wrapper qui:
     * Convertit les arguments en clé JSON
     * Vérifie si le résultat existe déjà dans le cache
     * Si oui: retourne le résultat mis en cache (évite le recalcul)
     * Si non: exécute la fonction, met le résultat en cache, puis le retourne

3. **Cas d'usage**: 
   - Calculs mathématiques récursifs (fibonacci, factorielle)
   - Appels API répétitifs avec mêmes paramètres
   - Transformations de données coûteuses

4. **Exemple**:
```typescript
const fibonacci = memoize((n) => {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
});

fibonacci(40); // Premier appel: lent
fibonacci(40); // Appels suivants: instantanés (utilise le cache)
```
```

## 🚀 Exemples Avancés

### Génération de Tests

**Sélectionner la fonction:**
```typescript
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
```

**Dans le chat:**
```
Génère des tests Jest complets pour cette fonction
```

**Résultat:**
```typescript
import { validateEmail } from './email-validator';

describe('validateEmail', () => {
  describe('valid emails', () => {
    it('should accept standard email format', () => {
      expect(validateEmail('user@example.com')).toBe(true);
    });

    it('should accept email with subdomain', () => {
      expect(validateEmail('user@mail.example.com')).toBe(true);
    });

    it('should accept email with plus sign', () => {
      expect(validateEmail('user+tag@example.com')).toBe(true);
    });

    it('should accept email with dots in local part', () => {
      expect(validateEmail('first.last@example.com')).toBe(true);
    });

    it('should accept email with numbers', () => {
      expect(validateEmail('user123@example456.com')).toBe(true);
    });
  });

  describe('invalid emails', () => {
    it('should reject email without @', () => {
      expect(validateEmail('userexample.com')).toBe(false);
    });

    it('should reject email without domain', () => {
      expect(validateEmail('user@')).toBe(false);
    });

    it('should reject email without TLD', () => {
      expect(validateEmail('user@example')).toBe(false);
    });

    it('should reject email with spaces', () => {
      expect(validateEmail('user @example.com')).toBe(false);
      expect(validateEmail('user@ example.com')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(validateEmail('')).toBe(false);
    });

    it('should reject email with multiple @', () => {
      expect(validateEmail('user@@example.com')).toBe(false);
    });
  });
});
```

### Optimisation de Performance

**Dans le chat:**
```
J'ai une fonction qui filtre un grand tableau (100k+ éléments) et c'est lent. 
Comment optimiser ?

Code actuel:
function filterActiveUsers(users) {
  return users.filter(u => u.active).map(u => u.id);
}
```

**Résultat:**
```typescript
// Optimisations proposées:

// 1. Utiliser une boucle for (plus rapide que filter+map)
function filterActiveUsers(users: User[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < users.length; i++) {
    if (users[i].active) {
      result.push(users[i].id);
    }
  }
  return result;
}

// 2. Si besoin de parallélisation (très grands datasets)
async function filterActiveUsersParallel(users: User[]): Promise<string[]> {
  const chunkSize = 10000;
  const chunks: User[][] = [];
  
  for (let i = 0; i < users.length; i += chunkSize) {
    chunks.push(users.slice(i, i + chunkSize));
  }
  
  const results = await Promise.all(
    chunks.map(chunk =>
      Promise.resolve(chunk.filter(u => u.active).map(u => u.id))
    )
  );
  
  return results.flat();
}

// 3. Avec Web Workers pour vrais gros datasets
// worker.ts
self.onmessage = (e: MessageEvent<User[]>) => {
  const result = e.data
    .filter(u => u.active)
    .map(u => u.id);
  self.postMessage(result);
};

// Benchmark:
// filter+map: ~50ms pour 100k éléments
// for loop:   ~20ms pour 100k éléments
// parallel:   ~15ms pour 100k éléments
```

## 🔒 Exemples de Sécurité

### Masquage de Secrets

Le système détecte et masque automatiquement les secrets:

**Avant (votre code):**
```typescript
const config = {
  openai: 'sk-proj-abcdef123456...',
  github: 'ghp_abcdefghijklmnop',
  database: 'mongodb://admin:password123@localhost:27017'
};
```

**Après masquage automatique (envoyé à l'IA):**
```typescript
const config = {
  openai: 'sk-***************',
  github: 'ghp_***************',
  database: 'mongodb://***:***@***'
};
```

## 💡 Astuces Pro

### 1. Contexte Précis
```
❌ "Crée une fonction"
✅ "Crée une fonction TypeScript async qui fetch des données d'une API REST, 
   gère les erreurs avec retry logic (3 tentatives), et retourne un type User"
```

### 2. Itération Progressive
```
Vous: Crée un hook React pour fetch des données
AI: [Code basique]
Vous: Ajoute le cache avec localStorage
AI: [Code amélioré]
Vous: Ajoute la gestion du loading et des erreurs
AI: [Code final]
```

### 3. Utiliser le Contexte du Fichier
- Sélectionnez du code avant de poser une question
- L'IA comprendra mieux le contexte de votre projet

---

**Besoin de plus d'exemples ?** Explorez la documentation complète dans le README!
