export const meals = [
  { id: "lemon-chicken", name: "Limonlu tavuk tabağı", detail: "Patates, yeşillik ve yoğurt", cost: 4.8, minutes: 30 },
  { id: "mushroom-pasta", name: "Mantarlı ıspanaklı makarna", detail: "Mantar, ıspanak ve parmesan", cost: 3.4, minutes: 20 },
  { id: "chickpea-bowl", name: "Nohutlu Akdeniz kasesi", detail: "Nohut, domates ve salatalık", cost: 2.9, minutes: 15 },
  { id: "lentil-soup", name: "Mercimek çorbası", detail: "Mercimek, havuç ve limon", cost: 2.2, minutes: 35 },
  { id: "egg-rice", name: "Yumurtalı sebzeli pilav", detail: "Pirinç, yumurta ve bezelye", cost: 2.7, minutes: 20 },
  { id: "tuna-potato", name: "Ton balıklı fırın patates", detail: "Patates, ton balığı ve yoğurt", cost: 3.6, minutes: 40 },
  { id: "tomato-gnocchi", name: "Domatesli gnocchi", detail: "Gnocchi, domates ve fesleğen", cost: 3.8, minutes: 20 },
  { id: "bean-wrap", name: "Fasulyeli dürüm", detail: "Fasulye, lavaş ve marul", cost: 2.8, minutes: 15 },
  { id: "chicken-fajita", name: "Tavuklu fajita", detail: "Tavuk, biber ve lavaş", cost: 4.5, minutes: 25 },
  { id: "broccoli-pasta", name: "Brokolili makarna", detail: "Brokoli, sarımsak ve peynir", cost: 3.1, minutes: 20 },
  { id: "baked-falafel", name: "Falafelli salata", detail: "Falafel, yeşillik ve tahin", cost: 3.9, minutes: 25 },
  { id: "omelette", name: "Peynirli sebzeli omlet", detail: "Yumurta, peynir ve biber", cost: 2.6, minutes: 15 },
] as const;

export type MealId = (typeof meals)[number]["id"];
