export interface MascotSkin {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
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
    name: 'Odkrywca',
    nameEn: 'Explorer',
    description: 'Klasyczny strój wyprawowy z kompasem.',
    descriptionEn: 'Classic expedition outfit with a compass.',
    colors: {
      body: '#1f8a80',
      accent: '#f59e0b',
      gear: '#0f3d39',
      visor: '#f8fafc',
    },
  },
  {
    id: 'forest-scout',
    name: 'Leśny zwiadowca',
    nameEn: 'Forest Scout',
    description: 'Zielone akcenty i lekki sprzęt terenowy.',
    descriptionEn: 'Green accents and lightweight field gear.',
    colors: {
      body: '#2f855a',
      accent: '#38b2ac',
      gear: '#1a202c',
      visor: '#f0fff4',
    },
  },
  {
    id: 'desert-nomad',
    name: 'Pustynny nomada',
    nameEn: 'Desert Nomad',
    description: 'Piaskowe barwy i ciepły płaszcz.',
    descriptionEn: 'Sand tones and a warm cloak.',
    colors: {
      body: '#c2410c',
      accent: '#f59e0b',
      gear: '#7c2d12',
      visor: '#fff7ed',
    },
  },
  {
    id: 'arctic-ranger',
    name: 'Arktyczny strażnik',
    nameEn: 'Arctic Ranger',
    description: 'Chłodny błysk i wytrzymała kurtka.',
    descriptionEn: 'Frosty glow and a rugged jacket.',
    colors: {
      body: '#1d4ed8',
      accent: '#38bdf8',
      gear: '#0f172a',
      visor: '#e0f2fe',
    },
  },
  {
    id: 'sky-captain',
    name: 'Kapitan nieba',
    nameEn: 'Sky Captain',
    description: 'Granat i złoto z podniebnym wyposażeniem.',
    descriptionEn: 'Navy and gold with airborne gear.',
    colors: {
      body: '#1e3a8a',
      accent: '#f59e0b',
      gear: '#0f172a',
      visor: '#eff6ff',
    },
  },
  {
    id: 'ruins-diver',
    name: 'Łowca ruin',
    nameEn: 'Ruins Diver',
    description: 'Ciemniejsze barwy i sprzęt ekspedycyjny.',
    descriptionEn: 'Darker tones and expedition gear.',
    colors: {
      body: '#475569',
      accent: '#f97316',
      gear: '#1f2937',
      visor: '#f8fafc',
    },
  },
];
