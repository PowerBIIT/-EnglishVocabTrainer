export interface MascotSkin {
  id: string;
  name: string;
  nameEn: string;
  nameUk: string;
  description: string;
  descriptionEn: string;
  descriptionUk: string;
  colors: {
    body: string;
    accent: string;
    gear: string;
    visor: string;
  };
}

export const mascotSkins: MascotSkin[] = [
  {
    id: 'explorer',
    name: 'Radosny Henio',
    nameEn: 'Playful Henio',
    nameUk: 'Веселий Геньо',
    description: 'Klasyczna kokardka w ciepłych kolorach.',
    descriptionEn: 'Classic bow in warm colors.',
    descriptionUk: 'Класичний бантик у теплих кольорах.',
    colors: {
      body: '#8b5cf6',
      accent: '#f59e0b',
      gear: '#4c1d95',
      visor: '#f5f3ff',
    },
  },
  {
    id: 'forest-scout',
    name: 'Ogrodowy Henio',
    nameEn: 'Garden Henio',
    nameUk: 'Садовий Геньо',
    description: 'Zielona obroża i wiosenne akcenty.',
    descriptionEn: 'Green collar with spring accents.',
    descriptionUk: 'Зелений нашийник та весняні акценти.',
    colors: {
      body: '#10b981',
      accent: '#38b2ac',
      gear: '#064e3b',
      visor: '#ecfdf5',
    },
  },
  {
    id: 'desert-nomad',
    name: 'Słoneczny Henio',
    nameEn: 'Sunny Henio',
    nameUk: 'Сонячний Геньо',
    description: 'Złocista bandana i letni styl.',
    descriptionEn: 'Golden bandana and summer style.',
    descriptionUk: 'Золота бандана та літній стиль.',
    colors: {
      body: '#f97316',
      accent: '#fbbf24',
      gear: '#c2410c',
      visor: '#fff7ed',
    },
  },
  {
    id: 'arctic-ranger',
    name: 'Zimowy Henio',
    nameEn: 'Winter Henio',
    nameUk: 'Зимовий Геньо',
    description: 'Niebieskie ozdoby i śnieżne akcenty.',
    descriptionEn: 'Blue decorations and snowy accents.',
    descriptionUk: 'Сині прикраси та сніжні акценти.',
    colors: {
      body: '#3b82f6',
      accent: '#38bdf8',
      gear: '#1e3a8a',
      visor: '#eff6ff',
    },
  },
  {
    id: 'sky-captain',
    name: 'Elegancki Henio',
    nameEn: 'Elegant Henio',
    nameUk: 'Елегантний Геньо',
    description: 'Granatowa muszka i złote detale.',
    descriptionEn: 'Navy bow tie with golden details.',
    descriptionUk: 'Темно-синій метелик із золотими деталями.',
    colors: {
      body: '#1e3a8a',
      accent: '#f59e0b',
      gear: '#0f172a',
      visor: '#eff6ff',
    },
  },
  {
    id: 'ruins-diver',
    name: 'Przygodowy Henio',
    nameEn: 'Adventure Henio',
    nameUk: 'Пригодницький Геньо',
    description: 'Szara chustka i odważny wygląd.',
    descriptionEn: 'Gray bandana with adventurous look.',
    descriptionUk: 'Сіра бандана та сміливий вигляд.',
    colors: {
      body: '#475569',
      accent: '#f97316',
      gear: '#1f2937',
      visor: '#f8fafc',
    },
  },
];
