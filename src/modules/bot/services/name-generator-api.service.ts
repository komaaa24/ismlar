import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface GeneratedName {
    name: string;
    meaning: string;
    origin: string;
    gender: 'boy' | 'girl';
    confidence: number;
}

interface ParentDNA {
    fatherFirst: string;
    fatherSecond: string;
    fatherPrefixTwo: string;
    fatherChunk: string;
    fatherLastTwo: string;
    motherFirst: string;
    motherSecond: string;
    motherFirstTwo: string;
    motherLastTwo: string;
}

interface ScoredCandidate {
    name: string;
    score: number;
    matches: string[];
    gender: 'boy' | 'girl';
}

@Injectable()
export class NameGeneratorApiService {
    private readonly logger = new Logger(NameGeneratorApiService.name);
    private readonly API_URL = 'http://94.158.53.20:8080/names_content.php';

    private readonly FALLBACK_GIRL_NAMES = [
        'Aisha', 'Anora', 'Aziza', 'Barno', 'Dilnoza', 'Durdona', 'Farangiz',
        'Gulbahor', 'Gulnora', 'Kabira', 'Kamola', 'Komila', 'Laylo', 'Malika',
        'Muslima', 'Nilufar', 'Nodira', 'Oisha', 'Oydin', 'Shahnoza', 'Shirin',
        'Zarina', 'Zilola', 'Zuhra', 'Muhabbat', 'Nasiba', 'Dilfuza', 'Gulchehra',
        'Madina', 'Sayyora', 'Sabina', 'Umida', 'Muslimah', 'Rayhona', 'Zebo',
        'Adolat', 'Sarvinoz', 'Mehribon', 'Mahliyo', 'Shahodat', 'Yulduz', 'Nafisa',
        'Gulshan', 'Sitora', 'Shahzoda', 'Gulrux', 'Mehrigul', 'Ruqiya', 'Saodat',
        'Rano', 'Yorqinoy', 'Mushtariy', 'Lobar', 'Nargiza', 'Ruxshona', 'Feruza',
        'Malohat', 'Gulqiz'
    ];

    private readonly FALLBACK_BOY_NAMES = [
        'Abdulloh', 'Amir', 'Alisher', 'Akmal', 'Bekzod', 'Davron', 'Elyor',
        'Farrux', 'Husan', 'Islom', 'Jahongir', 'Kamol', 'Kamoliddin', 'Mansur',
        'Nodir', 'Odil', 'Ravshan', 'Sardor', 'Timur', 'Umid', 'Zafar', 'Kamron',
        'Samir', 'Rustam', 'Komron', 'Shukrullo', 'Muslim', 'Azamat', 'Shohruh',
        'Abror', 'Behruz', 'Bilol', 'Diyor', 'Erkin', 'Habib', 'Jamshid', 'Karim',
        'Laziz', 'Mironshoh', 'Navruz', 'Oybek', 'Qahramon', 'Rahim', 'Sherzod',
        'Tursun', 'Umar', 'Yusuf', 'Ziyod', 'Zohid', 'Muhsin', 'Asadbek', 'Javlon',
        'Kamronbek', 'Shahboz', 'Tolib', 'Yahyo', 'Zikrulloh', 'Hikmatulloh'
    ];

    constructor(private readonly httpService: HttpService) { }

    /**
     * 🧬 Senior darajadagi yangi algoritm
     *  - Faqat real ismlar poolidan foydalanadi
     *  - Har bir nom ota-onadan olingan harflar bo'yicha ball oladi
     *  - API ma'nosi tasdiqlangan nomlargina qaytariladi
     */
    async generateNamesByPattern(
        fatherName: string,
        motherName: string,
        targetGender: 'boy' | 'girl' | 'all',
    ): Promise<GeneratedName[]> {
        const cleanedFather = fatherName.trim();
        const cleanedMother = motherName.trim();

        if (!cleanedFather || !cleanedMother) {
            return [];
        }

        const dna = this.buildParentDNA(cleanedFather, cleanedMother);
        const candidates = this.collectCandidates(targetGender);
        const scored = this.scoreCandidates(candidates, dna)
            .filter((item) => item.score > 0)
            .slice(0, 6);

        const results: GeneratedName[] = [];

        for (const candidate of scored) {
            const apiPayload = await this.lookupName(candidate.name);
            if (!apiPayload) {
                this.logger.warn(`API ma'nosi topilmadi: ${candidate.name}`);
                continue;
            }

            const story = this.buildStory(candidate.name, candidate.matches, cleanedFather, cleanedMother, dna);
            results.push({
                name: candidate.name,
                meaning: `${apiPayload.meaning}\n\n${story}`,
                origin: apiPayload.origin,
                gender: candidate.gender,
                confidence: Math.min(100, candidate.score),
            });

            if (results.length >= 3) {
                break;
            }
        }

        return results;
    }

    private collectCandidates(targetGender: 'boy' | 'girl' | 'all'): ScoredCandidate[] {
        if (targetGender === 'boy') {
            return this.FALLBACK_BOY_NAMES.map((name) => ({ name, gender: 'boy' as const, score: 0, matches: [] }));
        }
        if (targetGender === 'girl') {
            return this.FALLBACK_GIRL_NAMES.map((name) => ({ name, gender: 'girl' as const, score: 0, matches: [] }));
        }

        return [
            ...this.FALLBACK_GIRL_NAMES.map((name) => ({ name, gender: 'girl' as const, score: 0, matches: [] })),
            ...this.FALLBACK_BOY_NAMES.map((name) => ({ name, gender: 'boy' as const, score: 0, matches: [] })),
        ];
    }

    private buildParentDNA(fatherName: string, motherName: string): ParentDNA {
        const fatherLower = fatherName.toLowerCase();
        const motherLower = motherName.toLowerCase();

        return {
            fatherFirst: fatherLower[0] ?? '',
            fatherSecond: fatherLower[1] ?? '',
            fatherPrefixTwo: fatherLower.slice(0, 2),
            fatherChunk: fatherLower.slice(0, 3),
            fatherLastTwo: fatherLower.slice(-2),
            motherFirst: motherLower[0] ?? '',
            motherSecond: motherLower[1] ?? '',
            motherFirstTwo: motherLower.slice(0, 2),
            motherLastTwo: motherLower.slice(-2),
        };
    }

    private scoreCandidates(candidates: ScoredCandidate[], dna: ParentDNA): ScoredCandidate[] {
        return candidates
            .map((candidate) => this.scoreCandidate(candidate, dna))
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score);
    }

    private scoreCandidate(candidate: ScoredCandidate, dna: ParentDNA): ScoredCandidate {
        const lower = candidate.name.toLowerCase();
        const matches: string[] = [];
        let score = 0;

        if (!lower.includes(dna.fatherFirst)) {
            return { ...candidate, score: 0, matches: [] };
        }

        matches.push('father-first');
        score += 25;

        if (dna.fatherPrefixTwo && lower.startsWith(dna.fatherPrefixTwo)) {
            matches.push('father-prefix');
            score += 25;
        } else if (dna.fatherChunk && lower.includes(dna.fatherChunk)) {
            matches.push('father-chunk');
            score += 15;
        }

        if (dna.fatherLastTwo && lower.endsWith(dna.fatherLastTwo)) {
            matches.push('father-suffix');
            score += 15;
        }

        if (dna.motherLastTwo) {
            if (lower.endsWith(dna.motherLastTwo)) {
                matches.push('mother-suffix');
                score += 25;
            } else if (lower.includes(dna.motherLastTwo)) {
                matches.push('mother-fragment');
                score += 10;
            }
        }

        if (dna.motherFirstTwo && lower.startsWith(dna.motherFirstTwo)) {
            matches.push('mother-prefix');
            score += 10;
        }

        if (dna.motherFirst && lower.includes(dna.motherFirst)) {
            matches.push('mother-first');
            score += 5;
        }

        return { ...candidate, score, matches };
    }

    private buildStory(
        name: string,
        matches: string[],
        fatherName: string,
        motherName: string,
        dna: ParentDNA,
    ): string {
        const parts: string[] = [];

        if (matches.includes('father-prefix')) {
            parts.push(`${name} ismi ${fatherName} boshidagi "${dna.fatherPrefixTwo.toUpperCase()}" bo'g'ini bilan boshlanishi tufayli otadan meros oldi.`);
        } else if (matches.includes('father-chunk')) {
            parts.push(`${name} – ${fatherName} ismidagi "${dna.fatherChunk.toUpperCase()}" tovushlari bilan bog'liq.`);
        } else if (matches.includes('father-first')) {
            parts.push(`Otaning birinchi harfi "${dna.fatherFirst.toUpperCase()}" ismda albatta aks etdi.`);
        }

        if (matches.includes('father-suffix')) {
            parts.push(`Ism oxiri ${fatherName} oxiridagi "${dna.fatherLastTwo.toUpperCase()}" bilan tugadi.`);
        }

        if (matches.includes('mother-prefix')) {
            parts.push(`Onaning "${dna.motherFirstTwo.toUpperCase()}" bo'g'ini ham boshlanishga ta'sir ko'rsatdi.`);
        } else if (matches.includes('mother-first')) {
            parts.push(`"${dna.motherFirst.toUpperCase()}" harfi onadan olindi.`);
        }

        if (matches.includes('mother-suffix')) {
            parts.push(`Ism ${motherName} ismidagi oxirgi "${dna.motherLastTwo.toUpperCase()}" bo'g'ini bilan tugashi uchun tanlandi.`);
        } else if (matches.includes('mother-fragment')) {
            parts.push(`${motherName} ismidagi "${dna.motherLastTwo.toUpperCase()}" bo'g'ini nom ichida aks etdi.`);
        }

        parts.push('Natijada real ma\'lumot bazasida mavjud ism tanlandi.');
        return parts.join(' ');
    }

    private async lookupName(name: string): Promise<{ meaning: string; origin: string } | null> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(this.API_URL, {
                    params: { lang_id: 1, name },
                    responseType: 'text',
                    timeout: 5000,
                }),
            );

            const content = String(response.data || '').trim();
            if (!content || content.toLowerCase().includes('topilmadi')) {
                return null;
            }

            const originMatch = content.match(/\(([^)]+)\)/);
            const origin = originMatch ? originMatch[1] : 'Ma\'lumot bazasi';
            const meaning = content
                .replace(`${name} -`, '')
                .replace(originMatch?.[0] ?? '', '')
                .replace(/^-+/, '')
                .trim();

            return {
                meaning: meaning || `${name} ismi bazada mavjud, ammo ma'nosi to'liq ko'rsatilmagan.`,
                origin,
            };
        } catch (error) {
            this.logger.warn(`Ism API dan olinmadi (${name}): ${error.message}`);
            return null;
        }
    }
}
