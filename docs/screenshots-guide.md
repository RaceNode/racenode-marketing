# Screenshots Guide

Captures d'écran de l'application RaceNode pour le site marketing.

## Emplacement

```
src/assets/screenshots/
```

Les images sont optimisées automatiquement par Astro (WebP, srcset, lazy loading).

## Convention de nommage

```
[module]-[section].png
```

**Exemples :**
- `logistics-overview.png`
- `logistics-staff.png`
- `management-dashboard.png`

## Format recommandé

- **Largeur** : 2200px+ (captures @2x pour écrans Retina)
- **Format source** : PNG (Astro convertit en WebP)
- **Thème** : Dark mode (obligatoire)
- **Méthode** : Chrome DevTools → Device Mode → 2560px de large

## Screenshots existants

### Logistics (5/5)

- [x] `logistics-overview.png` - Dashboard overview
- [x] `logistics-staff.png` - Event Staff list
- [x] `logistics-accommodation.png` - Accommodation view
- [x] `logistics-travel.png` - Travel planning
- [x] `logistics-vehicles.png` - Event vehicles

### Management (0/?)

- [ ] `management-dashboard.png` - Dashboard principal
- [ ] `management-staff.png` - Staff members
- [ ] `management-drivers.png` - Drivers list
- [ ] `management-cars.png` - Cars/vehicles
- [ ] `management-calendar.png` - Calendar view

### Landing page (0/?)

- [ ] `hero-dashboard.png` - Screenshot principal pour la home

## Tips

1. **Données réalistes** : Utiliser des données de démo crédibles (noms, dates, lieux)
2. **État complet** : Montrer un état "rempli" de l'app, pas vide
3. **Pas de données sensibles** : Flouter ou remplacer les vraies données clients
4. **Résolution** : Capturer en 1x (pas de Retina) pour éviter les fichiers trop lourds
