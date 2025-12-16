import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import logger from '../../../shared/utils/logger';
import { RequestedNameEntity } from '../../../shared/database/entities';

export interface NameMeaning {
  meaning?: string;
  error?: string;
}

@Injectable()
export class NameMeaningService {
  private readonly apiBaseUrl = 'http://94.158.53.20:8080/names_content.php';

  constructor(
    @InjectRepository(RequestedNameEntity)
    private readonly requestedNameRepository: Repository<RequestedNameEntity>,
  ) { }

  async getNameMeaning(name: string, telegramId?: number, username?: string): Promise<NameMeaning> {
    try {
      const response = await axios.get(this.apiBaseUrl, {
        params: {
          lang_id: 1,
          name: name.trim(),
        },
        timeout: 10000, // 10 second timeout
      });

      if (
        response.data &&
        typeof response.data === 'string' &&
        response.data.trim()
      ) {
        return { meaning: response.data.trim() };
      } else {
        // Ma'lumot topilmadi - saqlash
        await this.saveRequestedName(name, telegramId, username);
        return { error: "Bu ism haqida ma'lumot topilmadi.\n\n⏰ Tez orada bu ism ma'lumotlar bazamizga qo'shiladi!" };
      }
    } catch (error) {
      logger.error('Name meaning API error:', error);
      return {
        error:
          "Ism manosi olishda xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring.",
      };
    }
  }

  isValidName(name: string): boolean {
    // Check if name contains only letters and spaces, and is not empty
    const nameRegex = /^[a-zA-ZА-Яа-яЁёўўҳҳғғқққ\s]+$/u;
    return (
      nameRegex.test(name.trim()) &&
      name.trim().length > 0 &&
      name.trim().length <= 50
    );
  }

  formatNameMeaning(name: string, meaning: string): string {
    return `🌟 <b>${name}</b> ismining ma'nosi:\n\n${meaning}\n\nIsmlar manosi botidan foydalanishda davom eting.`;
  }

  private async saveRequestedName(name: string, telegramId?: number, username?: string): Promise<void> {
    try {
      const normalizedName = name.trim().toLowerCase();

      // Ism allaqachon mavjudmi tekshirish
      const existing = await this.requestedNameRepository.findOne({
        where: { normalizedName },
      });

      if (existing) {
        // Mavjud bo'lsa, faqat counterni oshirish
        existing.requestCount += 1;
        existing.lastRequestedBy = telegramId;
        existing.lastRequestedByUsername = username;
        await this.requestedNameRepository.save(existing);
      } else {
        // Yangi ism qo'shish
        const newRequest = this.requestedNameRepository.create({
          name: name.trim(),
          normalizedName,
          requestCount: 1,
          lastRequestedBy: telegramId,
          lastRequestedByUsername: username,
          isProcessed: false,
        });
        await this.requestedNameRepository.save(newRequest);
      }
    } catch (error) {
      logger.error('Save requested name error:', error);
      // Xato bo'lsa ham davom ettirish (foydalanuvchiga ta'sir qilmasligi uchun)
    }
  }
}
