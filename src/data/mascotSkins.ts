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
    name: 'Odkrywca',
    nameEn: 'Explorer',
    nameUk: 'Дослідник',
    description: 'Klasyczny strój wyprawowy z kompasem.',
    descriptionEn: 'Classic expedition outfit with a compass.',
    descriptionUk: 'Класичний експедиційний одяг із компасом.',
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
    nameUk: 'Лісовий розвідник',
    description: 'Zielone akcenty i lekki sprzęt terenowy.',
    descriptionEn: 'Green accents and lightweight field gear.',
    descriptionUk: 'Зелені акценти та легке польове спорядження.',
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
    nameUk: 'Пустельний кочівник',
    description: 'Piaskowe barwy i ciepły płaszcz.',
    descriptionEn: 'Sand tones and a warm cloak.',
    descriptionUk: 'Піщані відтінки та теплий плащ.',
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
    nameUk: 'Арктичний рейнджер',
    description: 'Chłodny błysk i wytrzymała kurtka.',
    descriptionEn: 'Frosty glow and a rugged jacket.',
    descriptionUk: 'Холодний блиск і міцна куртка.',
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
    nameUk: 'Небесний капітан',
    description: 'Granat i złoto z podniebnym wyposażeniem.',
    descriptionEn: 'Navy and gold with airborne gear.',
    descriptionUk: 'Темно-синій і золото з небесним спорядженням.',
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
    nameUk: 'Мисливець за руїнами',
    description: 'Ciemniejsze barwy i sprzęt ekspedycyjny.',
    descriptionEn: 'Darker tones and expedition gear.',
    descriptionUk: 'Темніші відтінки та експедиційне спорядження.',
    colors: {
      body: '#475569',
      accent: '#f97316',
      gear: '#1f2937',
      visor: '#f8fafc',
    },
  },
];
