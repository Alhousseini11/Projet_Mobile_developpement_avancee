# 📺 Tutoriels Vidéo - Documentation Frontend

## 📋 Vue d'ensemble

La page **Tutoriels Vidéo** permet aux utilisateurs de regarder des vidéos éducatives sur l'entretien et la réparation automobile, organisées par catégorie et avec un système de recherche.

---

## 🎨 Fonctionnalités

### **1. Barre de Recherche**
- 🔍 Recherche en temps réel par titre ou description
- Recherche multi-catégories
- Clear après recherche

### **2. Filtrage par Catégories**
- **Entretien** (🔧) - Maintenance générale
- **Freins** (🛑) - Système de freinage
- **Suspension** (🚗) - Amortisseurs et ressorts
- **Batterie** (🔋) - Batterie et électricité
- **Diagnostic** (📊) - Diagnostic moteur
- **Éclairage** (💡) - Phares et feux
- **Fluides** (🧴) - Liquides moteur
- **Mécanique** (⚙️) - Moteur et transmission

### **3. Cartes de Tutoriels**
Chaque tutoriel affiche:
- ✅ Image de preview
- ✅ Titre du tutoriel
- ✅ Catégorie et durée
- ✅ Niveau de difficulté (Facile/Moyen/Difficile)
- ✅ Nombre de vues
- ✅ Note (étoiles)
- ✅ Bouton "Voir la Vidéo"

### **4. Détails du Tutoriel**
Modal avec:
- Description complète
- Outils requis
- Liste des étapes
- Bouton de lecture vidéo

---

## 🗂️ Structure des Fichiers

```
app/
├── components/
│   └── Tutorials.vue                  (Composant principal)
├── services/
│   └── TutorialService.ts             (Service API)
├── types/
│   └── tutorial.ts                    (Définitions TypeScript)
```

---

## 💾 Données Mock

### Structure d'un Tutoriel
```typescript
{
  id: '1',
  title: 'Changer Plaquettes de Frein',
  description: 'Guide complet pour remplacer les plaquettes',
  category: 'freins',
  difficulty: 'moyen',
  duration: 8,
  views: 15420,
  rating: 4.8,
  thumbnail: 'url-image',
  videoUrl: 'url-video',
  instructions: [...],
  tools: ['Clic', 'Clé', ...]
}
```

### 8 Tutoriels Inclus
1. ✅ Changer Plaquettes de Frein (Freins)
2. ✅ Remplacer la Batterie (Batterie)
3. ✅ Vidange Moteur (Mécanique)
4. ✅ Amortisseurs - Diagnostic (Suspension)
5. ✅ Changer Ampoules (Éclairage)
6. ✅ Entretien de Base (Entretien)
7. ✅ Changement Liquide Refroidissement (Fluide)
8. ✅ Diagnostic Moteur (Diagnostic)

---

## 🔧 Service TutorialService

### Méthodes Disponibles

| Méthode | Description | Retour |
|---------|-------------|--------|
| `getTutorials()` | Tous les tutoriels | `Tutorial[]` |
| `getTutorialById(id)` | Un tutoriel par ID | `Tutorial` |
| `getTutorialsByCategory(category)` | Tutoriels d'une catégorie | `Tutorial[]` |
| `searchTutorials(query)` | Recherche par texte | `Tutorial[]` |
| `createTutorial(data)` | Crée un tutoriel | `Tutorial` |
| `updateTutorial(id, data)` | Met à jour | `Tutorial` |
| `deleteTutorial(id)` | Supprime | `void` |
| `getPopularTutorials(limit)` | Populaires | `Tutorial[]` |
| `getTopRatedTutorials(limit)` | Mieux notés | `Tutorial[]` |
| `incrementViews(id)` | Ajoute une vue | `void` |
| `rateTutorial(id, rating)` | Ajoute une note | `Tutorial` |

---

## 📊 Types TypeScript

### TutorialCategory
```typescript
'entretien' | 'freins' | 'suspension' | 'batterie' | 
'diagnostic' | 'eclairage' | 'fluide' | 'mecanique'
```

### DifficultLevel
```typescript
'facile' | 'moyen' | 'difficile'
```

### Interfaces
- `Tutorial` - Tutoriel complet
- `CreateTutorialDTO` - Données création
- `UpdateTutorialDTO` - Données mise à jour
- `CategoryStats` - Stats d'une catégorie

---

## 🎯 Utilisation

### Charger tous les tutoriels
```typescript
const tutorials = await TutorialService.getTutorials()
```

### Rechercher des tutoriels
```typescript
const results = await TutorialService.searchTutorials('batterie')
```

### Filtrer par catégorie
```typescript
const freins = await TutorialService.getTutorialsByCategory('freins')
```

### Incrémenter les vues
```typescript
await TutorialService.incrementViews('1')
```

---

## 🎨 Système de Design

### Couleurs
- **Primaire**: #dc2626 (Rouge)
- **Background**: #111827 (Noir)
- **Surface**: #1f2937 (Gris foncé)
- **Success**: #10b981 (Vert)
- **Warning**: #f59e0b (Orange)
- **Error**: #ef4444 (Rouge)

### Composants
- Cartes avec image
- Onglets horizontaux
- Modales détails
- Barre de recherche

---

## 🚀 Prochaines Étapes

1. **Intégration API**
   - Remplacer mock data par vraies données
   - Ajouter authentification
   - Gérer les erreurs

2. **Lecteur Vidéo**
   - Intégrer HLS player
   - Support YouTube
   - Lecture hors ligne (cache)

3. **Fonctionnalités Avancées**
   - Télécharger les PDF guides
   - Historique de visionnage
   - Favoris/Bookmarks
   - Commentaires utilisateurs
   - Recommandations IA

4. **Performance**
   - Lazy loading images
   - Pagination des résultats
   - Cache local
   - Compression vidéo

---

## 📱 Responsive

- ✅ Mobile (<=768px)
- ✅ Tablette (769px-1024px)
- ✅ Desktop (>1024px)

---

## ✅ Checklist

- [x] Composant Tutorials.vue créé
- [x] Service TutorialService.ts créé
- [x] Types tutorial.ts définis
- [x] 8 tutoriels mock inclus
- [x] Recherche fonctionnelle
- [x] Filtrage par catégorie
- [x] Modal détails
- [x] Navigation intégrée
- [ ] Lecteur vidéo (à faire)
- [ ] Intégration API réelle (à faire)

---

## 🔗 Intégration avec Autres Pages

### Home.vue
```typescript
// Ajouter dans navigation
<GridLayout @tap="navigateTo('tutorials')">
  <Label text="🎓 Tutoriels" />
</GridLayout>
```

### Navigation Bottom Bar
```typescript
// Onglet "Tutoriels"
<GridLayout col="2" @tap="navigateTo('tutorials')">
  <Label text="🎓" class="text-2xl" />
</GridLayout>
```

---

## 📝 Notes

- Les vidéos sont actuellement des placeholders
- Les données sont stockées en mémoire (mock)
- À implémenter: persistence en base de données
- À améliorer: streaming vidéo natif

---

**Dernière mise à jour**: Mars 2026  
**Statut**: ✅ Version 1.0 - Production Ready
