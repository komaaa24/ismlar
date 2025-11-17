import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { NameMeaningService } from './name-meaning.service';

export type NameGender = 'boy' | 'girl' | 'unisex';
export type TrendPeriod = 'monthly' | 'yearly';
export type TrendGender = 'boy' | 'girl' | 'all';

export interface NameRecord {
  slug: string;
  name: string;
  gender: NameGender;
  origin: string;
  meaning: string;
  categories: string[];
  focusValues: string[];
  storytelling: string;
  translations: { language: string; value: string }[];
  trendIndex: { monthly: number; yearly: number };
  regions: string[];
  audioUrl?: string;
  related: string[];
}

export interface NameSuggestion {
  name: string;
  gender: NameGender;
  slug: string;
  origin: string;
  meaning: string;
  focusValues: string[];
  trendIndex: number;
}

export interface TrendInsight {
  name: string;
  movement: 'up' | 'down' | 'steady';
  score: number;
  region: string;
  gender: NameGender;
}

export interface QuizOption {
  label: string;
  value: string;
  tags: string[];
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: QuizOption[];
}

const CATEGORY_DESCRIPTORS: Record<string, { label: string; description: string }> = {
  symbolic: { label: 'Ramziy ruh', description: "Nur, ziyoli va qalbga yaqin ma'nolar." },
  leadership: { label: 'Rahbariy ohang', description: 'Jasoratli va yetakchi xarakterlar uchun.' },
  spiritual: { label: 'Ma\'naviy olam', description: 'Diniy va ruhiy mazmunga ega ismlar.' },
  heritage: { label: 'An\'anaviy', description: "Ota-bobolar merosidan kelgan klassik ismlar." },
  modern: { label: 'Zamonaviy', description: "Bugungi trend va yangi ma'no qo'shilgan ismlar." },
  nature: { label: 'Tabiat nafasi', description: 'Tabiat va unsurlardan ilhomlangan ismlar.' },
};

const CATEGORY_COMBOS: Array<{ key: string; label: string }> = [
  { key: 'symbolic_leadership', label: 'Ramziy ~ Rahbariy' },
  { key: 'spiritual_heritage', label: 'Ma\'naviy ~ An\'anaviy' },
  { key: 'modern_symbolic', label: 'Zamonaviy ~ Ramziy' },
  { key: 'nature_spiritual', label: 'Tabiat ~ Ma\'naviy' },
];

const NAME_LIBRARY: NameRecord[] = [
  {
    slug: 'zuhra',
    name: 'Zuhra',
    gender: 'girl',
    origin: 'Arabcha',
    meaning: "Tong yulduzi, yorug'lik taratuvchi nur.",
    categories: ['symbolic', 'spiritual'],
    focusValues: ['ramziy', 'nur', 'ilhom'],
    storytelling: "Zuhra tong chogida dunyoga kelgan farzand uchun yorug'lik tilashni bildiradi.",
    translations: [
      { language: 'Ruscha', value: 'Зухра' },
      { language: 'Inglizcha', value: 'Morning Star' },
      { language: 'Turkcha', value: 'Zuhra' },
    ],
    trendIndex: { monthly: 87, yearly: 91 },
    regions: ['Toshkent', 'Qashqadaryo'],
    audioUrl: 'https://cdn.pixabay.com/download/audio/2021/11/16/audio_2bbd603cd8.mp3?filename=warm-guitar-logo-12414.mp3',
    related: ['Zuhro', 'Zulayho', 'Ziyo'],
  },
  {
    slug: 'amir',
    name: 'Amir',
    gender: 'boy',
    origin: 'Arabcha',
    meaning: "Yetakchi, qo'mondon, rahbar.",
    categories: ['leadership', 'heritage'],
    focusValues: ['rahbar', 'jasorat'],
    storytelling: "Amir ismi o'g'il farzand uchun qat'iylik va mas'uliyat ramzidir.",
    translations: [
      { language: 'Ruscha', value: 'Амир' },
      { language: 'Inglizcha', value: 'Amir' },
      { language: 'Turkcha', value: 'Emir' },
    ],
    trendIndex: { monthly: 93, yearly: 88 },
    regions: ["Farg'ona", 'Toshkent'],
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_3febef0c3d.mp3?filename=soft-notification-136512.mp3',
    related: ['Amirbek', 'Amirxon', 'Emir'],
  },
  {
    slug: 'shirin',
    name: 'Shirin',
    gender: 'girl',
    origin: 'Forscha',
    meaning: "Shirin so'zli, yoqimli muomala qiluvchi.",
    categories: ['symbolic', 'heritage'],
    focusValues: ['ramziy', 'mehribon'],
    storytelling: "Shirin ismi mehribonlik va iliqlikni ifoda etadi.",
    translations: [
      { language: 'Ruscha', value: 'Ширин' },
      { language: 'Inglizcha', value: 'Sweet' },
      { language: 'Turkcha', value: 'Sirin' },
    ],
    trendIndex: { monthly: 81, yearly: 79 },
    regions: ['Buxoro', 'Samarqand'],
    audioUrl: 'https://cdn.pixabay.com/download/audio/2021/09/13/audio_81808b4a31.mp3?filename=soft-ambient-8282.mp3',
    related: ['Gulshirin', 'Mehriniso', 'Shahnoza'],
  },
  {
    slug: 'javlon',
    name: 'Javlon',
    gender: 'boy',
    origin: 'Turkiy',
    meaning: "G'ayrat va jasorat timsoli.",
    categories: ['leadership', 'modern'],
    focusValues: ['rahbar', 'jasorat', 'zamonaviy'],
    storytelling: 'Javlon ismi faol va tashabbuskor xarakterni aks ettiradi.',
    translations: [
      { language: 'Ruscha', value: 'Джавлон' },
      { language: 'Inglizcha', value: 'Valor' },
      { language: 'Turkcha', value: 'Javlon' },
    ],
    trendIndex: { monthly: 76, yearly: 84 },
    regions: ['Namangan', 'Andijon'],
    audioUrl: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_17b9987dd8.mp3?filename=soft-logo-6124.mp3',
    related: ['Jasur', 'Javohir', 'Javod'],
  },
  {
    slug: 'muslima',
    name: 'Muslima',
    gender: 'girl',
    origin: 'Arabcha',
    meaning: 'Islom diniga sodiq, musulmon ayol.',
    categories: ['spiritual', 'heritage'],
    focusValues: ["ma'naviy", 'ramziy'],
    storytelling: "Muslima ismi sokinlik va sodiqlikni bildiradi.",
    translations: [
      { language: 'Ruscha', value: 'Муслима' },
      { language: 'Inglizcha', value: 'Muslima' },
      { language: 'Turkcha', value: 'Muslima' },
    ],
    trendIndex: { monthly: 89, yearly: 94 },
    regions: ['Namangan', 'Andijon'],
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/09/20/audio_55a0189da2.mp3?filename=gentle-sound-121110.mp3',
    related: ['Mubina', 'Muhsina', 'Mushtariy'],
  },
  {
    slug: 'bilol',
    name: 'Bilol',
    gender: 'boy',
    origin: 'Arabcha',
    meaning: 'Halovat beruvchi, qalbni taskin etuvchi.',
    categories: ['spiritual', 'symbolic'],
    focusValues: ["ma'naviy", 'ramziy', 'ilhom'],
    storytelling: 'Bilol ismi ezgulik va fidoyilik ramzi.',
    translations: [
      { language: 'Ruscha', value: 'Билол' },
      { language: 'Inglizcha', value: 'Bilol' },
      { language: 'Turkcha', value: 'Bilol' },
    ],
    trendIndex: { monthly: 97, yearly: 90 },
    regions: ['Surxondaryo', 'Toshkent'],
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/10/24/audio_8d3b8b1dcb.mp3?filename=clean-notification-124058.mp3',
    related: ['Bilola', 'Biloliddin', 'Nilufar'],
  },
  {
    slug: 'laylo',
    name: 'Laylo',
    gender: 'girl',
    origin: 'Forscha',
    meaning: 'Tungi huzur, romantik ohang.',
    categories: ['modern', 'symbolic'],
    focusValues: ['ramziy', 'muloyim'],
    storytelling: "Laylo ismi she'riyat va muhabbatni ifodalaydi.",
    translations: [
      { language: 'Ruscha', value: 'Лайло' },
      { language: 'Inglizcha', value: 'Layla' },
      { language: 'Turkcha', value: 'Leyla' },
    ],
    trendIndex: { monthly: 92, yearly: 96 },
    regions: ['Toshkent', 'Samarqand'],
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c1889958cf.mp3?filename=soft-intro-135464.mp3',
    related: ['Layloyim', 'Laziza', 'Royhon'],
  },
  {
    slug: 'islom',
    name: 'Islom',
    gender: 'boy',
    origin: 'Arabcha',
    meaning: 'Tinchlik va totuvlik.',
    categories: ['spiritual', 'heritage'],
    focusValues: ["ma'naviy", 'ramziy', 'jahongir'],
    storytelling: "Islom ismi birlik va e'tiqodni aks ettiradi.",
    translations: [
      { language: 'Ruscha', value: 'Ислам' },
      { language: 'Inglizcha', value: 'Islam' },
      { language: 'Turkcha', value: 'Islam' },
    ],
    trendIndex: { monthly: 84, yearly: 90 },
    regions: ["Qoraqalpog'iston", 'Toshkent'],
    audioUrl: 'https://cdn.pixabay.com/download/audio/2023/04/05/audio_c84b3f6b55.mp3?filename=soft-bell-147424.mp3',
    related: ['Imron', 'Ilyos', 'Imad'],
  },
];

const TREND_MOVEMENTS: TrendInsight[] = [
  { name: 'Amir', movement: 'up', score: 93, region: "Farg'ona", gender: 'boy' },
  { name: 'Laylo', movement: 'up', score: 96, region: 'Toshkent', gender: 'girl' },
  { name: 'Bilol', movement: 'steady', score: 90, region: 'Surxondaryo', gender: 'boy' },
  { name: 'Zuhra', movement: 'up', score: 91, region: 'Qashqadaryo', gender: 'girl' },
  { name: 'Muslima', movement: 'steady', score: 94, region: 'Namangan', gender: 'girl' },
  { name: 'Javlon', movement: 'down', score: 84, region: 'Andijon', gender: 'boy' },
];

const QUIZ_FLOW: QuizQuestion[] = [
  {
    id: 'temper',
    text: "Farzandingiz xarakteri qanday bo'lishini istaysiz?",
    options: [
      { label: 'Sokin va muloyim', value: 'calm', tags: ['ramziy', 'muloyim'] },
      { label: 'Yetakchi va faol', value: 'leader', tags: ['rahbar'] },
      { label: 'Ijodkor va ilhomli', value: 'creator', tags: ['ilhom'] },
      { label: "Ma'naviyatli va yuksak", value: 'spiritual', tags: ["ma'naviy"] },
    ],
  },
  {
    id: 'legacy',
    text: "Qaysi qatlamga yaqinmisiz?",
    options: [
      { label: "An'anaviy meros", value: 'heritage', tags: ['heritage'] },
      { label: 'Zamonaviy ruh', value: 'modern', tags: ['zamonaviy'] },
      { label: "Tabiat va uyg'unlik", value: 'nature', tags: ['tabiat'] },
    ],
  },
  {
    id: 'sound',
    text: "Ism ohangi qanday bo'lishi kerak?",
    options: [
      { label: 'Qisqa va chaqqon', value: 'short', tags: ['rahbar'] },
      { label: 'Uzun va lirika', value: 'long', tags: ['ramziy'] },
      { label: 'Quvnoq va ritmik', value: 'rhythm', tags: ['zamonaviy'] },
    ],
  },
  {
    id: 'blend',
    text: "Familiyangiz bilan uyg'unlik?",
    options: [
      { label: 'Bosh harf mosligi muhim', value: 'initial', tags: ['moslik'] },
      { label: 'Ohangdoshlik muhim', value: 'rhythm', tags: ['ohang'] },
      { label: 'Qadriyatni ifodalasin', value: 'value', tags: ["ma'naviy"] },
    ],
  },
  {
    id: 'bonus',
    text: 'Ismga yana bir istak:',
    options: [
      { label: "Trendda bo'lsin", value: 'trendy', tags: ['zamonaviy', 'trend'] },
      { label: 'Oson talaffuz qilinsin', value: 'easy', tags: ['muloyim'] },
      { label: "Unutilmas bo'lsin", value: 'unique', tags: ['rahbar', 'ramziy'] },
    ],
  },
];

const PERSONA_TEMPLATES: Record<
  string,
  { label: string; tags: string[]; summary: string }
> = {
  radiant: {
    label: 'Nurafshon',
    tags: ['ramziy', 'ilhom', 'muloyim'],
    summary: "Yorug'lik taratuvchi va qalbni iliqlantiruvchi ismlar to'plami.",
  },
  pioneer: {
    label: 'Yetakchi',
    tags: ['rahbar', 'zamonaviy'],
    summary: 'Jasorat va modern ruhni ifodalovchi kombinatsiyalar.',
  },
  heritage: {
    label: 'Merosbon',
    tags: ["ma'naviy", 'heritage'],
    summary: "An'anaviy va ruhiy qadriyatlarni saqlab qoluvchi ismlar.",
  },
  harmony: {
    label: 'Uyg\'un',
    tags: ['tabiat', 'muloyim', 'ohang'],
    summary: "Tabiat va ohang uyg'unligini sevuvchilar uchun tavsiyalar.",
  },
};

const COMMUNITY_POLLS = [
  {
    question: "2024-yilda qaysi ism trendni zabt etadi?",
    options: ['Laylo', 'Amir', 'Muslima', 'Bilol'],
  },
  {
    question: "Qaysi yo'nalish sizga ko'proq yoqadi?",
    options: ['Ramziy', 'Rahbariy', "Ma'naviy", 'Zamonaviy'],
  },
];

@Injectable()
export class NameInsightsService {
  constructor(
    @Inject(forwardRef(() => NameMeaningService))
    private readonly meaningService: NameMeaningService
  ) { }

  getCategoryDescriptors(): typeof CATEGORY_DESCRIPTORS {
    return CATEGORY_DESCRIPTORS;
  }

  getCategoryCombos(): Array<{ key: string; label: string }> {
    return CATEGORY_COMBOS;
  }

  findRecordByName(name: string): NameRecord | undefined {
    const normalized = name.trim().toLowerCase();
    return NAME_LIBRARY.find(
      (record) =>
        record.slug === normalized || record.name.toLowerCase() === normalized,
    );
  }

  search(query: string, limit = 10): NameRecord[] {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return NAME_LIBRARY.slice(0, limit);
    }
    return NAME_LIBRARY.filter((record) => {
      return (
        record.name.toLowerCase().includes(normalized) ||
        record.focusValues.some((value) => value.includes(normalized)) ||
        record.categories.some((value) => value.includes(normalized)) ||
        record.origin.toLowerCase().includes(normalized)
      );
    }).slice(0, limit);
  }

  async getRichNameMeaning(name: string): Promise<{
    record?: NameRecord;
    meaning: string;
    error?: string;
  }> {
    const record = this.findRecordByName(name);
    if (record) {
      return { record, meaning: record.meaning };
    }
    const meaning = await this.meaningService.getNameMeaning(name);
    if (meaning.meaning) {
      return { meaning: meaning.meaning };
    }
    return { meaning: '', error: meaning.error };
  }

  formatRichMeaning(name: string, meaning: string, record?: NameRecord): string {
    const headline = `🌟 <b>${name}</b> ismi haqida`;
    const meaningBlock = meaning
      ? `\n📘 <b>Ma'nosi:</b> ${meaning}\n`
      : "\n📘 Ma'lumot hozircha topilmadi.\n";

    if (!record) {
      return `${headline}\n${meaningBlock}\n🔁 Yana boshqa ismni sinab ko'ring.`;
    }

    const origin = `🌍 <b>Kelib chiqishi:</b> ${record.origin}`;
    const values = record.focusValues.length
      ? `✨ <b>Ohangi:</b> ${record.focusValues.map((value) => `#${value}`).join('  ')}`
      : '';
    const story = record.storytelling ? `\n🧩 <i>${record.storytelling}</i>\n` : '';
    const related = record.related.length
      ? `\n🔎 O'xshash ismlar: ${record.related.join(', ')}`
      : '';
    const trend = `📈 Trend indeks: oy => ${record.trendIndex.monthly} / yil => ${record.trendIndex.yearly}`;

    return `${headline}\n${meaningBlock}${origin}\n${values}${story}${trend}${related}`;
  }

  getSimilarNames(name: string, limit = 4): NameSuggestion[] {
    const record = this.findRecordByName(name);
    if (!record) {
      return [];
    }
    const matches = NAME_LIBRARY.filter((candidate) => {
      if (candidate.slug === record.slug) {
        return false;
      }
      return candidate.focusValues.some((tag) => record.focusValues.includes(tag));
    });
    return matches.slice(0, limit).map((candidate) => ({
      name: candidate.name,
      gender: candidate.gender,
      slug: candidate.slug,
      origin: candidate.origin,
      meaning: candidate.meaning,
      focusValues: candidate.focusValues,
      trendIndex: candidate.trendIndex.monthly,
    }));
  }

  getTranslations(slug: string): { language: string; value: string }[] {
    const record = this.findRecordByName(slug);
    return record?.translations ?? [];
  }

  getAudioUrl(slug: string): string | undefined {
    const record = this.findRecordByName(slug);
    return record?.audioUrl;
  }

  getTrending(period: TrendPeriod, gender: TrendGender): TrendInsight[] {
    const filtered = TREND_MOVEMENTS.filter((item) =>
      gender === 'all' ? true : item.gender === gender,
    );
    return filtered
      .map((item) => ({
        ...item,
        score:
          period === 'monthly'
            ? this.findRecordByName(item.name)?.trendIndex.monthly ?? item.score
            : this.findRecordByName(item.name)?.trendIndex.yearly ?? item.score,
      }))
      .sort((a, b) => b.score - a.score);
  }

  getNamesForCategory(key: string, gender: TrendGender): NameSuggestion[] {
    const categories = key.split('_');
    const filtered = NAME_LIBRARY.filter((record) => {
      const matchesGender = gender === 'all' ? true : record.gender === gender;
      const matchesCategory = categories.every((category) =>
        record.categories.includes(category),
      );
      return matchesGender && matchesCategory;
    });
    return filtered.map((record) => ({
      name: record.name,
      gender: record.gender,
      slug: record.slug,
      origin: record.origin,
      meaning: record.meaning,
      focusValues: record.focusValues,
      trendIndex: record.trendIndex.monthly,
    }));
  }

  getQuizFlow(): QuizQuestion[] {
    return QUIZ_FLOW;
  }

  derivePersona(tags: string[]): {
    code: string;
    label: string;
    summary: string;
  } {
    const scoreMap = new Map<string, number>();
    tags.forEach((tag) => {
      Object.entries(PERSONA_TEMPLATES).forEach(([code, template]) => {
        if (template.tags.includes(tag)) {
          scoreMap.set(code, (scoreMap.get(code) ?? 0) + 1);
        }
      });
    });
    const [code] = Array.from(scoreMap.entries()).sort((a, b) => b[1] - a[1])[0] ?? [
      'radiant',
      0,
    ];
    const template = PERSONA_TEMPLATES[code];
    return { code, label: template.label, summary: template.summary };
  }

  /**
   * 🧬 KREATIV LETTER-BLENDING ALGORITM
   * Ota-ona ismlaridan harflarni olib, farzand ismlariga mos qidiradi
   * 
   * METODLAR:
   * 1. Prefix Blending: Ota ismining boshi + Ona ismining oxiri
   * 2. Suffix Blending: Ona ismining boshi + Ota ismining oxiri
   * 3. Letter Pool Matching: Ikkala ismdan umumiy harflar
   * 4. Syllable Fusion: Bo'g'inlarni kombinatsiya qilish
   * 5. Character Presence: Ota/ona ismi harflari mavjudligi
   * 
   * MISOL:
   * Ota: "Aziz" + Ona: "Madina" = "Amir" (A+mir), "Zamir" (Z+amir)
   * Ota: "Jamshid" + Ona: "Dilnoza" = "Jasur" (J+asur), "Dilshod" (Dil+shod)
   */
  buildPersonalizedRecommendations(
    targetGender: TrendGender,
    focusTags: string[],
    parentNames?: string[],
  ): { persona: { code: string; label: string; summary: string }; suggestions: NameSuggestion[] } {
    const persona = this.derivePersona(focusTags);
    const genderFilter = targetGender === 'all' ? undefined : targetGender;
    
    // 🎯 Ota-ona ismlari tahlili
    let parentMeanings: string[] = [];
    let parentFocusTags: string[] = [];
    let parentOrigins: string[] = [];
    let fatherName = '';
    let motherName = '';
    
    if (parentNames && parentNames.length > 0) {
      fatherName = parentNames[0]?.trim().toLowerCase() || '';
      motherName = parentNames[1]?.trim().toLowerCase() || '';
      
      parentNames.forEach(parentName => {
        const normalizedName = parentName.trim().toLowerCase();
        const parentRecord = NAME_LIBRARY.find(
          record => record.name.toLowerCase() === normalizedName || 
                   record.slug === normalizedName
        );
        
        if (parentRecord) {
          const meaningWords = parentRecord.meaning
            .toLowerCase()
            .split(/[,،.;:]/)
            .map(word => word.trim())
            .filter(word => word.length > 3);
          
          parentMeanings.push(...meaningWords);
          parentFocusTags.push(...parentRecord.focusValues);
          
          if (parentRecord.origin) {
            parentOrigins.push(parentRecord.origin);
          }
        }
      });
    }
    
    // 🧬 Harfiy tahlil funksiyalari
    const extractLetters = (name: string): Set<string> => {
      return new Set(name.toLowerCase().split(''));
    };
    
    const calculateLetterOverlap = (childName: string, parentName: string): number => {
      const childLetters = extractLetters(childName);
      const parentLetters = extractLetters(parentName);
      let overlap = 0;
      parentLetters.forEach(letter => {
        if (childLetters.has(letter)) overlap++;
      });
      return overlap;
    };
    
    const hasPrefixMatch = (childName: string, parentName: string, length: number = 2): boolean => {
      return childName.toLowerCase().startsWith(parentName.toLowerCase().substring(0, length));
    };
    
    const hasSuffixMatch = (childName: string, parentName: string, length: number = 2): boolean => {
      return childName.toLowerCase().endsWith(parentName.toLowerCase().slice(-length));
    };
    
    const calculateSyllableMatch = (childName: string, parentNames: string[]): number => {
      let score = 0;
      const childLower = childName.toLowerCase();
      
      parentNames.forEach(parentName => {
        const parentLower = parentName.toLowerCase();
        // 2-3 harfli bo'g'inlarni qidirish
        for (let i = 0; i < parentLower.length - 1; i++) {
          const syllable2 = parentLower.substring(i, i + 2);
          const syllable3 = parentLower.substring(i, i + 3);
          
          if (childLower.includes(syllable2)) score += 30;
          if (childLower.includes(syllable3)) score += 50;
        }
      });
      
      return score;
    };
    
    const suggestions = NAME_LIBRARY.filter((record) => {
      const matchesGender = !genderFilter || record.gender === genderFilter;
      const matchesPersona = persona.summary
        ? personaSummaryTags(persona.code).some((tag) => record.focusValues.includes(tag))
        : true;
      const matchesFocus = focusTags.length
        ? focusTags.some((tag) => record.focusValues.includes(tag))
        : true;
      
      return matchesGender && matchesPersona && matchesFocus;
    })
      .map((record) => {
        let score = record.trendIndex.monthly;
        
        // 🧬 LETTER-BLENDING SCORING SYSTEM
        if (parentNames && parentNames.length > 0 && (fatherName || motherName)) {
          
          // ⭐️ 1. FOCUS VALUES MATCHING (+100 har bir mos kelish uchun)
          const focusMatch = parentFocusTags.filter(tag => 
            record.focusValues.includes(tag)
          ).length;
          score += focusMatch * 100;
          
          // ⭐️ 2. ORIGIN MATCHING (+150 bonus)
          if (parentOrigins.length > 0 && record.origin && 
              parentOrigins.includes(record.origin)) {
            score += 150;
          }
          
          // ⭐️ 3. MEANING SIMILARITY (+80 har bir o'xshash so'z uchun)
          const recordMeaningWords = record.meaning
            .toLowerCase()
            .split(/[,،.;:]/)
            .map(word => word.trim())
            .filter(word => word.length > 3);
          
          const meaningMatch = parentMeanings.filter(parentWord =>
            recordMeaningWords.some(recordWord => 
              recordWord.includes(parentWord) || parentWord.includes(recordWord)
            )
          ).length;
          score += meaningMatch * 80;
          
          // 🧬 4. PREFIX BLENDING (Ota ismining boshi bilan boshlanishi) (+120 bonus)
          if (fatherName && hasPrefixMatch(record.name, fatherName, 2)) {
            score += 120;
          }
          
          // 🧬 5. PREFIX BLENDING (Ona ismining boshi bilan boshlanishi) (+120 bonus)
          if (motherName && hasPrefixMatch(record.name, motherName, 2)) {
            score += 120;
          }
          
          // 🧬 6. SUFFIX BLENDING (Ota ismining oxiri bilan tugashi) (+100 bonus)
          if (fatherName && hasSuffixMatch(record.name, fatherName, 2)) {
            score += 100;
          }
          
          // 🧬 7. SUFFIX BLENDING (Ona ismining oxiri bilan tugashi) (+100 bonus)
          if (motherName && hasSuffixMatch(record.name, motherName, 2)) {
            score += 100;
          }
          
          // 🧬 8. LETTER POOL MATCHING (Ota ismidan harflar) (+15 har bir harf uchun)
          if (fatherName) {
            const fatherLetterMatch = calculateLetterOverlap(record.name, fatherName);
            score += fatherLetterMatch * 15;
          }
          
          // 🧬 9. LETTER POOL MATCHING (Ona ismidan harflar) (+15 har bir harf uchun)
          if (motherName) {
            const motherLetterMatch = calculateLetterOverlap(record.name, motherName);
            score += motherLetterMatch * 15;
          }
          
          // 🧬 10. SYLLABLE FUSION (Bo'g'in o'xshashligi) (+30-50 har bir mos bo'g'in)
          const syllableScore = calculateSyllableMatch(record.name, parentNames);
          score += syllableScore;
          
          // 🧬 11. FIRST LETTER EXACT MATCH (Birinchi harf aynan mos) (+60 bonus)
          const parentFirstLetters = parentNames.map(name => 
            name.trim()[0]?.toLowerCase()
          );
          if (parentFirstLetters.includes(record.name[0]?.toLowerCase())) {
            score += 60;
          }
          
          // 🧬 12. COMBO BONUS: Ota + Ona harflari kombinatsiyasi (+200 super bonus)
          // Masalan: Farzand ismida ikkala ota-ona ismidan kam 3 ta harf bo'lsa
          if (fatherName && motherName) {
            const hasFatherLetters = calculateLetterOverlap(record.name, fatherName) >= 2;
            const hasMotherLetters = calculateLetterOverlap(record.name, motherName) >= 2;
            
            if (hasFatherLetters && hasMotherLetters) {
              score += 200; // 🎁 Super kreativ kombinatsiya!
            }
          }
        }
        
        return {
          name: record.name,
          gender: record.gender,
          slug: record.slug,
          origin: record.origin,
          meaning: record.meaning,
          focusValues: record.focusValues,
          trendIndex: score,
        };
      })
      .sort((a, b) => b.trendIndex - a.trendIndex)
      .slice(0, 5);

    return { persona, suggestions };
  }

  getCommunityPoll(): { question: string; options: string[] } {
    const index = Math.floor(Math.random() * COMMUNITY_POLLS.length);
    return COMMUNITY_POLLS[index];
  }
}

function personaSummaryTags(code: string): string[] {
  return PERSONA_TEMPLATES[code]?.tags ?? [];
}
