import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InlineKeyboard, Keyboard } from 'grammy';
import { InlineQueryResultArticle } from 'grammy/types';
import { Repository } from 'typeorm';
import { BotCoreService, BotContext } from './services/bot-core.service';
import { NameMeaningService } from './services/name-meaning.service';
import { NameInsightsService, QuizQuestion, TrendGender, TrendPeriod } from './services/name-insights.service';
import { UserFavoritesService } from './services/user-favorites.service';
import { UserPersonaService } from './services/user-persona.service';
import { AdminService } from './services/admin.service';
import { UserEntity } from '../../shared/database/entities/user.entity';
import { PlanEntity } from '../../shared/database/entities/plan.entity';
import { TargetGender } from '../../shared/database/entities/user-persona-profile.entity';
import { getClickRedirectLink } from '../../shared/generators/click-redirect-link.generator';
import { generatePaymeLink } from '../../shared/generators/payme-link.generator';
import { generateClickOnetimeLink } from '../../shared/generators/click-onetime-link.generator';

type FlowName = 'personalization' | 'quiz';

interface FlowState {
  name: FlowName;
  step: number;
  payload: Record<string, unknown>;
}

const PERSONAL_FOCUS_TAGS: Array<{ key: string; label: string; tag: string }> = [
  { key: 'ramziy', label: 'Ramziy', tag: 'ramziy' },
  { key: 'rahbar', label: 'Rahbariy', tag: 'rahbar' },
  { key: 'manaviy', label: "Ma'naviy", tag: "ma'naviy" },
  { key: 'zamonaviy', label: 'Zamonaviy', tag: 'zamonaviy' },
  { key: 'tabiat', label: 'Tabiat', tag: 'tabiat' },
  { key: 'ilhom', label: 'Ilhom', tag: 'ilhom' },
];

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);
  private readonly bot = this.botCoreService.bot;
  private readonly quizFlow: QuizQuestion[];

  constructor(
    private readonly botCoreService: BotCoreService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(PlanEntity)
    private readonly planRepository: Repository<PlanEntity>,
    private readonly nameMeaningService: NameMeaningService,
    @Inject(forwardRef(() => NameInsightsService))
    private readonly insightsService: NameInsightsService,
    @Inject(forwardRef(() => UserFavoritesService))
    private readonly favoritesService: UserFavoritesService,
    private readonly personaService: UserPersonaService,
    private readonly adminService: AdminService,
  ) {
    this.quizFlow = this.insightsService.getQuizFlow();
    this.registerHandlers();
  }

  public getBot() {
    return this.bot;
  }

  private registerHandlers(): void {
    this.bot.command('start', (ctx) => this.handleStart(ctx));
    this.bot.command('admin', (ctx) => this.handleAdmin(ctx));
    this.bot.command('stats', (ctx) => this.adminService.handleAdminCommand(ctx, 'stats'));
    this.bot.command('grant', (ctx) => this.adminService.handleAdminCommand(ctx, 'grant'));
    this.bot.command('revoke', (ctx) => this.adminService.handleAdminCommand(ctx, 'revoke'));
    this.bot.command('find', (ctx) => this.adminService.handleAdminCommand(ctx, 'find'));
    this.bot.on('inline_query', (ctx) => this.handleInlineQuery(ctx));
    this.bot.on('callback_query', (ctx) => this.handleCallback(ctx));
    this.bot.on('message', (ctx) => this.handleMessage(ctx));
  }

  private async handleStart(ctx: BotContext): Promise<void> {
    await this.createUserIfNeeded(ctx);
    ctx.session.mainMenuMessageId = undefined;
    ctx.session.flow = undefined;
    ctx.session.quizAnswers = undefined;
    ctx.session.quizTags = undefined;

    // Senior-level welcome message with reply keyboard
    const telegramId = ctx.from?.id;
    let hasAccess = false;
    let user: UserEntity | null = null;

    if (telegramId) {
      user = await this.userRepository.findOne({ where: { telegramId } });
      hasAccess = this.userHasActiveAccess(user);
    }

    const firstName = ctx.from?.first_name || 'do\'st';

    // 🎨 Beautiful welcome message
    const welcomeMessage =
      `╔══════════════════════╗\n` +
      `   👑 ISMLAR MANOSI    \n` +
      `╚══════════════════════╝\n\n` +
      `Assalomu alaykum, <b>${firstName}</b>! 👋\n\n` +
      `🌟 <b>Botimiz imkoniyatlari:</b>\n\n` +
      `🔍 <b>Ism Ma'nosi</b> - Istalgan ismning ma'nosi\n` +
      `🎯 <b>Shaxsiy Tavsiya</b> - Sizga mos ismlar\n` +
      `📊 <b>Trendlar</b> - Eng mashhur ismlar\n` +
      `⭐ <b>Sevimlilar</b> - Yoqqan ismlarni saqlash\n\n` +
      (hasAccess
        ? `✅ <b>Status:</b> VIP foydalanuvchi\n♾️ Barcha imkoniyatlar ochiq!\n\n`
        : `💡 <b>Status:</b> Oddiy foydalanuvchi\n💳 Bir martalik to'lov - 5,555 so'm\n♾️ Umrbod premium!\n\n`) +
      `📱 <b>Qanday ishlatish:</b>\n` +
      `Pastdagi tugmalardan birini bosing yoki\n` +
      `ismni to'g'ridan-to'g'ri yozing! ✍️`;

    // 🎹 Professional Reply Keyboard
    const keyboard = new Keyboard()
      .text('🔍 Ism Ma\'nosi').text('🎯 Shaxsiy Tavsiya')
      .row()
      .text('📊 Trendlar').text('⭐ Sevimlilar')
      .row();

    if (!hasAccess) {
      keyboard.text('💳 Premium Obuna');
    }

    keyboard.resized();

    await ctx.reply(welcomeMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  }

  private async handleAdmin(ctx: BotContext): Promise<void> {
    await this.adminService.handleAdminCommand(ctx, 'help');
  }

  private async handleInlineQuery(ctx: BotContext): Promise<void> {
    const query = ctx.inlineQuery?.query ?? '';
    const matches = this.insightsService.search(query, 12);
    const results: InlineQueryResultArticle[] = matches.map((record) => ({
      type: 'article',
      id: record.slug,
      title: record.name,
      description: `${record.gender === 'girl' ? '👧' : '👦'} ${record.origin} • trend ${record.trendIndex.monthly}%`,
      input_message_content: {
        message_text: this.insightsService.formatRichMeaning(record.name, record.meaning, record),
        parse_mode: 'HTML',
      },
      reply_markup: this.buildNameDetailKeyboard(record.slug),
    }));

    await ctx.answerInlineQuery(results, { cache_time: 5, is_personal: true });
  }

  private async handleCallback(ctx: BotContext): Promise<void> {
    const data = ctx.callbackQuery?.data;
    if (!data) {
      await ctx.answerCallbackQuery();
      return;
    }

    if (data.startsWith('onetime|')) {
      const [, provider] = data.split('|');
      if (provider === 'click' || provider === 'payme') {
        await this.handleOnetimeProvider(ctx, provider as 'click' | 'payme');
      }
      return;
    }

    const [namespace, ...parts] = data.split(':');
    switch (namespace) {
      case 'menu':
        await this.handleMenuActions(ctx, parts);
        break;
      case 'name':
        await this.handleNameCallbacks(ctx, parts);
        break;
      case 'personal':
        await this.handlePersonalizationCallbacks(ctx, parts);
        break;
      case 'trend':
        await this.handleTrendCallbacks(ctx, parts);
        break;
      case 'main':
        await this.showMainMenu(ctx);
        await ctx.answerCallbackQuery();
        break;
      case 'name_meaning':
        await this.promptForName(ctx);
        await ctx.answerCallbackQuery();
        break;
      case 'onetime_payment':
        await this.showOnetimePayment(ctx);
        await ctx.answerCallbackQuery();
        break;
      default:
        await ctx.answerCallbackQuery();
    }
  }

  private async handleMenuActions(ctx: BotContext, parts: string[]): Promise<void> {
    const action = parts[0];
    switch (action) {
      case 'personal':
        await this.startPersonalizationFlow(ctx);
        await ctx.answerCallbackQuery();
        break;
      case 'trends':
        await this.showTrendMenu(ctx);
        await ctx.answerCallbackQuery();
        break;
      default:
        await this.showMainMenu(ctx);
        await ctx.answerCallbackQuery();
        break;
    }
  }

  private async handleNameCallbacks(ctx: BotContext, parts: string[]): Promise<void> {
    const action = parts[0];
    const slug = parts[1];
    switch (action) {
      case 'detail':
        await this.showNameDetail(ctx, slug);
        break;
      case 'trend':
        await this.showNameTrend(ctx, slug);
        break;
      default:
        await ctx.answerCallbackQuery();
    }
  }

  private async handlePersonalizationCallbacks(ctx: BotContext, parts: string[]): Promise<void> {
    const flow = this.ensurePersonalizationSession(ctx);
    const action = parts[0];

    switch (action) {
      case 'gender': {
        const gender = (parts[1] as TrendGender) ?? 'all';
        flow.payload.targetGender = gender;
        flow.step = 3;
        await ctx.editMessageText(
          '👪 Familiyangizni kiriting yoki <i>skip</i> deb yozing.',
          { parse_mode: 'HTML' },
        );
        await ctx.answerCallbackQuery();
        break;
      }
      case 'focus': {
        const key = parts[1];
        if (key === 'done') {
          await this.finalizePersonalization(ctx);
          await ctx.answerCallbackQuery();
        } else if (key === 'reset') {
          ctx.session.flow = undefined;
          await this.startPersonalizationFlow(ctx);
          await ctx.answerCallbackQuery();
        } else {
          const current = (flow.payload.focusValues as string[] | undefined) ?? [];
          if (current.includes(key)) {
            flow.payload.focusValues = current.filter((tag) => tag !== key);
          } else {
            flow.payload.focusValues = [...current, key];
          }
          await this.promptFocusSelection(ctx);
          await ctx.answerCallbackQuery();
        }
        break;
      }
      default:
        await ctx.answerCallbackQuery();
    }
  }



  private async handleFavoriteCallbacks(ctx: BotContext, parts: string[]): Promise<void> {
    const action = parts[0];
    if (action === 'list') {
      const page = parseInt(parts[1] ?? '1', 10) || 1;
      await this.showFavorites(ctx, page);
      await ctx.answerCallbackQuery();
      return;
    }

    if (action === 'toggle') {
      const slug = parts[1];
      await this.toggleFavorite(ctx, slug);
      return;
    }

    await ctx.answerCallbackQuery();
  }

  private async handleTrendCallbacks(ctx: BotContext, parts: string[]): Promise<void> {
    const action = parts[0];
    if (action === 'overview') {
      const period = (parts[1] as TrendPeriod) ?? 'monthly';
      const gender = (parts[2] as TrendGender) ?? 'all';
      await this.showTrendOverview(ctx, period, gender);
      await ctx.answerCallbackQuery();
      return;
    }

    await ctx.answerCallbackQuery();
  }



  private async handleMessage(ctx: BotContext): Promise<void> {
    const text = ctx.message?.text?.trim();
    if (!text || text.startsWith('/')) {
      return;
    }

    // Handle reply keyboard button presses
    switch (text) {
      case '🔍 Ism Ma\'nosi':
        await this.promptForName(ctx);
        return;
      case '🎯 Shaxsiy Tavsiya':
        await this.startPersonalizationFlow(ctx);
        return;
      case '📊 Trendlar':
        await this.showTrendMenu(ctx);
        return;
      case '⭐ Sevimlilar':
        await this.showFavorites(ctx);
        return;
      case '💳 Premium Obuna':
        await this.showOnetimePayment(ctx);
        return;
    }

    if (await this.tryHandleFlowMessage(ctx, text)) {
      return;
    }

    await this.createUserIfNeeded(ctx);

    if (this.nameMeaningService.isValidName(text)) {
      await this.processNameMeaning(ctx, text);
    } else {
      await this.showNameInputHelp(ctx, text);
    }
  }

  private async createUserIfNeeded(ctx: BotContext): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) {
      return;
    }

    let user = await this.userRepository.findOne({ where: { telegramId } });
    if (!user) {
      user = this.userRepository.create({
        telegramId,
        username: ctx.from?.username,
        firstName: ctx.from?.first_name,
        lastName: ctx.from?.last_name,
      });
      await this.userRepository.save(user);
      this.logger.log(`New user created: ${telegramId}`);
    }
  }

  private buildMainMenuKeyboard(hasAccess: boolean): InlineKeyboard {
    const keyboard = new InlineKeyboard()
      .text("🌟 Ism ma'nosi", 'name_meaning')
      .text('🎯 Shaxsiy tavsiya', 'menu:personal')
      .row()
      .text('📈 Trendlar', 'menu:trends')
      .row()
      .switchInline('🔍 Inline qidiruv', '');

    if (!hasAccess) {
      keyboard.row().text("💳 Bir martalik to'lov", 'onetime_payment');
    }

    return keyboard;
  }

  private async showMainMenu(ctx: BotContext, initial = false): Promise<void> {
    const telegramId = ctx.from?.id;
    let hasAccess = false;

    if (telegramId) {
      const user = await this.userRepository.findOne({ where: { telegramId } });
      hasAccess = this.userHasActiveAccess(user);
    }

    const keyboard = this.buildMainMenuKeyboard(hasAccess);
    const greeting = ctx.from?.first_name ?? 'do\'st';
    let message = `Assalomu alaykum, ${greeting}! 👋\n\n`;
    message += '🌟 Ismlar manosi botiga xush kelibsiz!\n\n';
    message += 'Bu yerda siz ismlarning ma\'nosi, trendlari va shaxsiy tavsiyalarni topasiz.\n\n';
    message += hasAccess
      ? '✅ Premium foydalanuvchisiz — barcha bo\'limlar ochiq.\n\n'
      : "💳 Bir martalik to'lov qiling va umrbod premiumga ega bo'ling (5 555 so'm).\n\n";
    message += "Quyidagi bo'limlardan birini tanlang yoki ismni yozing:";

    if (initial) {
      const sent = await ctx.reply(message, { reply_markup: keyboard, parse_mode: 'HTML' });
      ctx.session.mainMenuMessageId = sent.message_id;
      return;
    }

    try {
      await ctx.editMessageText(message, { reply_markup: keyboard, parse_mode: 'HTML' });
    } catch {
      const sent = await ctx.reply(message, { reply_markup: keyboard, parse_mode: 'HTML' });
      ctx.session.mainMenuMessageId = sent.message_id;
    }
  }

  private async promptForName(ctx: BotContext): Promise<void> {
    const keyboard = new InlineKeyboard().text('🏠 Menyu', 'main:menu');
    await ctx.reply(
      '🌟 Ism ma\'nosi\n\nIltimos, qidirayotgan ismingizni yozing.\n\n💡 Masalan: Kamoliddin, Oisha, Muhammad.',
      { reply_markup: keyboard, parse_mode: 'HTML' },
    );
  }

  private async processNameMeaning(ctx: BotContext, name: string): Promise<void> {
    const hasAccess = await this.ensurePaidAccess(ctx);
    if (!hasAccess) {
      return;
    }

    await ctx.replyWithChatAction('typing');
    const { record, meaning, error } = await this.insightsService.getRichNameMeaning(name);

    if (!meaning && error) {
      await ctx.reply(`❌ ${error}`);
      return;
    }

    const message = this.insightsService.formatRichMeaning(record?.name ?? name, meaning, record);
    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: this.buildNameDetailKeyboard(record?.slug ?? name.toLowerCase()),
    });
  }

  private buildNameDetailKeyboard(slug: string): InlineKeyboard {
    return new InlineKeyboard()
      .text('⭐ Sevimlilarga', `fav:toggle:${slug}`)
      .row()
      .text('📈 Trend', `name:trend:${slug}`)
      .text('🏠 Menyu', 'main:menu');
  }

  private async showNameDetail(ctx: BotContext, slug: string): Promise<void> {
    const record = this.insightsService.findRecordByName(slug);
    if (!record) {
      await ctx.answerCallbackQuery('Ma\'lumot topilmadi');
      return;
    }
    const message = this.insightsService.formatRichMeaning(record.name, record.meaning, record);
    await this.safeEditOrReply(ctx, message, this.buildNameDetailKeyboard(record.slug));
    await ctx.answerCallbackQuery();
  }

  private async showNameTrend(ctx: BotContext, slug: string): Promise<void> {
    const record = this.insightsService.findRecordByName(slug);
    if (!record) {
      await ctx.answerCallbackQuery('Trend ma\'lumoti yo\'q');
      return;
    }
    const message =
      `📈 <b>${record.name}</b> trend indikatorlari:\n\n` +
      `Oy: ${record.trendIndex.monthly}\n` +
      `Yil: ${record.trendIndex.yearly}\n` +
      `Hududlar: ${record.regions.join(', ')}`;
    await this.safeEditOrReply(ctx, message, this.buildNameDetailKeyboard(record.slug));
    await ctx.answerCallbackQuery();
  }

  private async ensurePaidAccess(ctx: BotContext): Promise<boolean> {
    const telegramId = ctx.from?.id;
    if (!telegramId) {
      await ctx.reply('Foydalanuvchi aniqlanmadi.');
      return false;
    }

    const user = await this.userRepository.findOne({ where: { telegramId } });
    if (this.userHasActiveAccess(user)) {
      return true;
    }

    const keyboard = new InlineKeyboard()
      .text("💳 To'lov qilish", 'onetime_payment')
      .text('🏠 Menyu', 'main:menu');

    await ctx.reply(
      "🔒 Ushbu bo'limdan foydalanish uchun premium talab qilinadi.\n\n" +
      "💵 Narx: 5 555 so'm\n" +
      '♾️ Umrbod kirish.\n\n' +
      "To'lovni amalga oshirib, barcha imkoniyatlarni oching.",
      { reply_markup: keyboard },
    );
    return false;
  }

  private userHasActiveAccess(user: UserEntity | null | undefined): boolean {
    if (!user) {
      return false;
    }
    if (user.isActive && user.subscriptionEnd && new Date(user.subscriptionEnd) > new Date()) {
      return true;
    }
    return false;
  }





  private async showTrendMenu(ctx: BotContext): Promise<void> {
    const keyboard = new InlineKeyboard()
      .text("📈 Oy bo'yicha", 'trend:overview:monthly:all')
      .text("📊 Yil bo'yicha", 'trend:overview:yearly:all')
      .row()
      .text('👧 Qizlar', 'trend:overview:monthly:girl')
      .text("👦 O'g'illar", 'trend:overview:monthly:boy')
      .row()
      .text('🏠 Menyu', 'main:menu');

    await this.safeEditOrReply(
      ctx,
      '📈 Trendlar markazi\n\nOylik yoki yillik reytingni ko\'ring, jins bo\'yicha filtrlang.',
      keyboard,
    );
  }

  private async showTrendOverview(ctx: BotContext, period: TrendPeriod, gender: TrendGender): Promise<void> {
    const insights = this.insightsService.getTrending(period, gender).slice(0, 6);
    if (!insights.length) {
      await ctx.answerCallbackQuery('Trend ma\'lumotlari yo\'q');
      return;
    }

    const lines = insights.map((item, index) => {
      const emoji = item.gender === 'girl' ? '👧' : '👦';
      const movement = item.movement === 'up' ? '⬆️' : item.movement === 'down' ? '⬇️' : '⏸';
      return `${index + 1}. ${emoji} <b>${item.name}</b> — ${movement} ${item.score} (${item.region})`;
    });

    const keyboard = new InlineKeyboard();
    insights.forEach((item) => keyboard.row().text(item.name, `name:detail:${item.name.toLowerCase()}`));
    keyboard.row().text('🏠 Menyu', 'main:menu');

    await this.safeEditOrReply(
      ctx,
      `📈 Trendlar (${period}, ${gender})\n\n${lines.join('\n')}`,
      keyboard,
    );
  }

  private async showCommunityMenu(ctx: BotContext): Promise<void> {
    const keyboard = new InlineKeyboard()
      .text('⭐ Sevimlilar', 'fav:list:1')
      .text('📊 So\'rovnoma', 'community:poll')
      .row()
      .text('🔗 Ulashish', 'community:share')
      .text('🏠 Menyu', 'main:menu');

    await this.safeEditOrReply(
      ctx,
      '🌍 Jamiyat bo\'limi\n\nSevimli ismlaringizni boshqaring, so\'rovnomalarda qatnashing, do\'stlarga ulashing.',
      keyboard,
    );
  }

  private ensurePersonalizationSession(ctx: BotContext): FlowState {
    if (!ctx.session.flow || (ctx.session.flow as FlowState).name !== 'personalization') {
      ctx.session.flow = {
        name: 'personalization',
        step: 1,
        payload: { focusValues: [] },
      };
    }
    return ctx.session.flow as FlowState;
  }

  private async startPersonalizationFlow(ctx: BotContext): Promise<void> {
    this.ensurePersonalizationSession(ctx);
    const keyboard = new InlineKeyboard()
      .text('👧 Qiz bolaga', 'personal:gender:girl')
      .text("👦 O'g'il bolaga", 'personal:gender:boy')
      .row()
      .text('🤍 Aniqlanmagan', 'personal:gender:all')
      .row()
      .text('🏠 Menyu', 'main:menu');

    const message = 
      "✨ <b>Farzandingizga ism tanlashda ikkilanyapsizmi?</b>\n\n" +
      "🎯 Biz sizga yordam beramiz! Shaxsiy tavsiya generatorimiz:\n\n" +
      "🧬 Ota-ona ismlaridan ilhom oladi\n" +
      "💎 Sizning qadriyatlaringizga mos keladi\n" +
      "📊 Zamonaviy trendlarni hisobga oladi\n" +
      "🌟 Mukammal ma'noli ismlarni taklif qiladi\n\n" +
      "Qaysi jins uchun ism izlayotganingizni belgilang:";

    await this.safeEditOrReply(
      ctx,
      message,
      keyboard,
    );
  }

  private async handlePersonalizationMessage(ctx: BotContext, message: string): Promise<boolean> {
    const flow = ctx.session.flow as FlowState | undefined;
    if (!flow || flow.name !== 'personalization') {
      return false;
    }

    switch (flow.step) {
      case 3: {
        if (message.toLowerCase() !== 'skip') {
          flow.payload.familyName = message;
        }
        flow.step = 4;
        await ctx.reply('👨‍👩‍👦 Ota-ona ismlarini vergul bilan kiriting yoki skip.');
        return true;
      }
      case 4: {
        if (message.toLowerCase() !== 'skip') {
          flow.payload.parentNames = message.split(',').map((part) => part.trim()).filter(Boolean);
        }
        flow.step = 5;
        await this.promptFocusSelection(ctx);
        return true;
      }
      default:
        return false;
    }
  }

  private async promptFocusSelection(ctx: BotContext): Promise<void> {
    const flow = this.ensurePersonalizationSession(ctx);
    const selected = (flow.payload.focusValues as string[] | undefined) ?? [];
    const keyboard = new InlineKeyboard();
    PERSONAL_FOCUS_TAGS.forEach((item, index) => {
      const prefix = selected.includes(item.tag) ? '✅' : '▫️';
      keyboard.text(`${prefix} ${item.label}`, `personal:focus:${item.tag}`);
      if (index % 2 === 1) {
        keyboard.row();
      }
    });
    keyboard.row().text('✅ Tayyor', 'personal:focus:done');
    keyboard.text('🔄 Qayta', 'personal:focus:reset');
    keyboard.row().text('🏠 Menyu', 'main:menu');

    const selectedLine = selected.length
      ? `Tanlangan qadriyatlar: ${selected.map((tag) => `#${tag}`).join(' ')}`
      : 'Hozircha tanlov belgilanmagan.';

    await this.safeEditOrReply(
      ctx,
      '✨ Qaysi qadriyatlar muhim? Bir nechtasini tanlang:\n\n' + selectedLine,
      keyboard,
    );
  }

  private async finalizePersonalization(ctx: BotContext): Promise<void> {
    const flow = ctx.session.flow as FlowState | undefined;
    if (!flow || flow.name !== 'personalization') {
      return;
    }

    const telegramId = ctx.from?.id;
    if (!telegramId) {
      await ctx.answerCallbackQuery('Foydalanuvchi aniqlanmadi');
      return;
    }

    const user = await this.userRepository.findOne({ where: { telegramId } });
    if (!user) {
      await ctx.answerCallbackQuery('/start yuboring');
      return;
    }

    const targetGender = (flow.payload.targetGender as TrendGender | undefined) ?? 'all';
    const focusValues = (flow.payload.focusValues as string[] | undefined) ?? [];
    const parentNames = (flow.payload.parentNames as string[] | undefined) ?? [];

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🚀 NEW: API-POWERED GENERATION
    // If parent names provided, use advanced API generation
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    let suggestions: any[] = [];
    let personaInfo = { code: 'default', label: 'Shaxsiy Profil', summary: 'API orqali yaratilgan' };

    if (parentNames && parentNames.length >= 2) {
      // Use API-based generation
      await ctx.replyWithChatAction('typing');
      
      try {
        suggestions = await this.insightsService.buildApiGeneratedRecommendations(
          parentNames[0],
          parentNames[1],
          targetGender,
        );
        
        personaInfo = {
          code: 'api_generated',
          label: '🧬 API Generatsiya',
          summary: `Ota: ${parentNames[0]}, Ona: ${parentNames[1]} asosida yaratilgan`,
        };
      } catch (error) {
        // Fallback to genetic algorithm
        const result = this.insightsService.buildPersonalizedRecommendations(
          targetGender,
          focusValues,
          parentNames
        );
        suggestions = result.suggestions;
        personaInfo = result.persona;
      }
    } else {
      // Use existing genetic algorithm
      const result = this.insightsService.buildPersonalizedRecommendations(
        targetGender,
        focusValues,
        parentNames
      );
      suggestions = result.suggestions;
      personaInfo = result.persona;
    }

    const personaTarget: TargetGender = targetGender === 'boy' || targetGender === 'girl' ? targetGender : 'unknown';
    await this.personaService.upsertProfile(user.id, {
      targetGender: personaTarget,
      familyName: flow.payload.familyName as string | undefined,
      parentNames: flow.payload.parentNames as string[] | undefined,
      focusValues,
      personaType: personaInfo.code,
    });

    const lines = suggestions.map((item, index) => {
      const emoji = item.gender === 'girl' ? '👧' : '👦';
      return `${index + 1}. ${emoji} <b>${item.name}</b> — ${item.meaning}`;
    });

    const keyboard = new InlineKeyboard();
    suggestions.forEach((item) => keyboard.row().text(item.name, `name:detail:${item.slug}`));
    keyboard.row().text('🏠 Menyu', 'main:menu');

    await this.safeEditOrReply(
      ctx,
      `🎯 Profil: <b>${personaInfo.label}</b>\n${personaInfo.summary}\n\n${lines.join('\n')}`,
      keyboard,
    );

    ctx.session.flow = undefined;
    await ctx.answerCallbackQuery('Shaxsiy tavsiyalar tayyor!');
  }

  private async startQuiz(ctx: BotContext): Promise<void> {
    ctx.session.flow = { name: 'quiz', step: 0, payload: {} };
    ctx.session.quizAnswers = {};
    ctx.session.quizTags = [];
    await this.sendQuizQuestion(ctx, 0);
  }

  private async sendQuizQuestion(ctx: BotContext, index: number): Promise<void> {
    const question = this.quizFlow[index];
    if (!question) {
      return;
    }
    const keyboard = new InlineKeyboard();
    question.options.forEach((option) => {
      keyboard.row().text(option.label, `quiz:answer:${question.id}:${option.value}`);
    });
    keyboard.row().text('🏠 Menyu', 'main:menu');

    await this.safeEditOrReply(
      ctx,
      `🧪 Savol ${index + 1}/${this.quizFlow.length}\n\n${question.text}`,
      keyboard,
    );
  }

  private async processQuizAnswer(ctx: BotContext, questionId: string, value: string): Promise<void> {
    const flow = ctx.session.flow as FlowState | undefined;
    if (!flow || flow.name !== 'quiz') {
      await ctx.answerCallbackQuery();
      return;
    }

    const question = this.quizFlow.find((item) => item.id === questionId);
    if (!question) {
      await ctx.answerCallbackQuery();
      return;
    }

    const option = question.options.find((item) => item.value === value);
    if (!option) {
      await ctx.answerCallbackQuery();
      return;
    }

    ctx.session.quizAnswers = {
      ...(ctx.session.quizAnswers ?? {}),
      [questionId]: value,
    };

    ctx.session.quizTags = [...(ctx.session.quizTags ?? []), ...option.tags];

    const nextStep = flow.step + 1;
    if (nextStep >= this.quizFlow.length) {
      await this.finishQuiz(ctx);
      return;
    }

    flow.step = nextStep;
    await this.sendQuizQuestion(ctx, nextStep);
    await ctx.answerCallbackQuery('Tanlov qabul qilindi');
  }

  private async finishQuiz(ctx: BotContext): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) {
      await ctx.answerCallbackQuery('Foydalanuvchi aniqlanmadi');
      return;
    }

    const user = await this.userRepository.findOne({ where: { telegramId } });
    if (!user) {
      await ctx.answerCallbackQuery('/start yuboring');
      return;
    }

    const profile = await this.personaService.getProfile(user.id);
    const targetGender: TrendGender = profile?.targetGender === 'boy' || profile?.targetGender === 'girl'
      ? profile.targetGender
      : 'all';

    const focusValues = profile?.focusValues ?? [];
    const parentNames = profile?.parentNames ?? [];
    const tags = [...(ctx.session.quizTags ?? []), ...focusValues];
    const result = this.insightsService.buildPersonalizedRecommendations(
      targetGender,
      tags,
      parentNames
    );

    await this.personaService.upsertProfile(user.id, {
      targetGender: targetGender === 'boy' || targetGender === 'girl' ? targetGender : 'unknown',
      focusValues: tags,
      personaType: result.persona.code,
      quizAnswers: ctx.session.quizAnswers ?? {},
    });

    const lines = result.suggestions.map((item, index) => {
      const emoji = item.gender === 'girl' ? '👧' : '👦';
      return `${index + 1}. ${emoji} <b>${item.name}</b> — ${item.meaning}`;
    });

    const keyboard = new InlineKeyboard();
    result.suggestions.forEach((item) => keyboard.row().text(item.name, `name:detail:${item.slug}`));
    keyboard.row().text('🏠 Menyu', 'main:menu');

    await this.safeEditOrReply(
      ctx,
      `✅ Mini test yakunlandi!\nProfil: <b>${result.persona.label}</b>\n${result.persona.summary}\n\n${lines.join('\n')}`,
      keyboard,
    );

    ctx.session.flow = undefined;
    ctx.session.quizAnswers = undefined;
    ctx.session.quizTags = undefined;

    await ctx.answerCallbackQuery('Tavsiyalar tayyor');
  }

  private async tryHandleFlowMessage(ctx: BotContext, message: string): Promise<boolean> {
    return this.handlePersonalizationMessage(ctx, message);
  }

  private async showFavorites(ctx: BotContext, page = 1): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) {
      await ctx.reply('Foydalanuvchi aniqlanmadi');
      return;
    }
    const user = await this.userRepository.findOne({ where: { telegramId } });
    if (!user) {
      await ctx.reply('/start yuboring');
      return;
    }

    const list = await this.favoritesService.listFavorites(user.id, page);
    if (!list.totalItems) {
      const keyboard = new InlineKeyboard().text('🌟 Ism qidirish', 'name_meaning').text('🏠 Menyu', 'main:menu');
      await this.safeEditOrReply(
        ctx,
        '⭐ Sevimli ismlar topilmadi. Har bir ism kartasida ⭐ tugmasini bosib qo\'shing.',
        keyboard,
      );
      return;
    }

    const offset = (list.page - 1) * list.pageSize;
    const lines = list.items.map((item, index) => {
      const emoji = item.gender === 'girl' ? '👧' : item.gender === 'boy' ? '👦' : '✨';
      return `${offset + index + 1}. ${emoji} <b>${item.name}</b> — ${item.origin ?? ''}`;
    });

    const keyboard = new InlineKeyboard();
    list.items.forEach((item) => {
      if (item.slug) {
        keyboard.row().text(item.name, `name:detail:${item.slug}`);
      }
    });

    if (list.totalPages > 1) {
      const prev = page > 1 ? page - 1 : list.totalPages;
      const next = page < list.totalPages ? page + 1 : 1;
      keyboard.row().text('⬅️', `fav:list:${prev}`).text(`${page}/${list.totalPages}`, 'main:menu').text('➡️', `fav:list:${next}`);
    }

    keyboard.row().text('🏠 Menyu', 'main:menu');

    await this.safeEditOrReply(
      ctx,
      `⭐ Sevimlilar (jami ${list.totalItems})\n\n${lines.join('\n')}`,
      keyboard,
    );
  }

  private async toggleFavorite(ctx: BotContext, slug: string): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) {
      await ctx.answerCallbackQuery('Foydalanuvchi aniqlanmadi');
      return;
    }

    const user = await this.userRepository.findOne({ where: { telegramId } });
    if (!user) {
      await ctx.answerCallbackQuery('/start yuboring');
      return;
    }

    try {
      const result = await this.favoritesService.toggleFavorite(user.id, slug);
      await ctx.answerCallbackQuery(
        result === 'added' ? '⭐ Sevimlilarga qo\'shildi' : '🗑 Sevimlilardan olib tashlandi',
        { show_alert: false } as any,
      );
    } catch (error) {
      this.logger.error('Toggle favorite failed', error as Error);
      await ctx.answerCallbackQuery('Xatolik yuz berdi');
    }
  }

  private async showOnetimePayment(ctx: BotContext): Promise<void> {
    const plan = await this.planRepository.findOne({ where: { name: 'Basic' } });
    if (!plan) {
      await ctx.answerCallbackQuery("Reja topilmadi");
      return;
    }

    const keyboard = new InlineKeyboard()
      .text('💙 Payme', 'onetime|payme')
      .text('🟢 Click', 'onetime|click')
      .row()
      .text('🏠 Menyu', 'main:menu');

    await this.safeEditOrReply(
      ctx,
      "💰 Premium: 5 555 so'm\n♾️ Muddati: Umrbod\n\nQuyidagi to'lov usulini tanlang:",
      keyboard,
    );
  }

  private async handleOnetimeProvider(ctx: BotContext, provider: 'click' | 'payme'): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) {
      await ctx.answerCallbackQuery('Foydalanuvchi aniqlanmadi');
      return;
    }
    const user = await this.userRepository.findOne({ where: { telegramId } });
    if (!user) {
      await ctx.answerCallbackQuery('/start yuboring');
      return;
    }

    const plan = await this.planRepository.findOne({ where: { name: 'Basic' } });
    if (!plan) {
      await ctx.answerCallbackQuery('Reja topilmadi');
      return;
    }

    const amount = Number(plan.price);
    const providerTitle = provider === 'click' ? 'Click' : 'Payme';

    let paymentLink: string;

    if (provider === 'click') {
      // Click onetime to'lov uchun to'g'ri generator
      paymentLink = generateClickOnetimeLink(user.id, plan.id, amount);
    } else {
      // Payme
      paymentLink = generatePaymeLink({
        amount,
        planId: plan.id,
        userId: user.id,
      });
    }

    const keyboard = new InlineKeyboard()
      .url("💳 To'lovga o'tish", paymentLink)
      .row()
      .text('🏠 Menyu', 'main:menu');

    await this.safeEditOrReply(
      ctx,
      `💳 <b>${providerTitle}</b> orqali to'lov\n\nSumma: ${plan.price} so'm\n♾️ Muddati: Umrbod\n\nQuyidagi havola orqali to'lovni tasdiqlang.`,
      keyboard,
    );
    await ctx.answerCallbackQuery();
  }

  private async showNameInputHelp(ctx: BotContext, input: string): Promise<void> {
    const keyboard = new InlineKeyboard().text("🌟 Ism ma'nosi", 'name_meaning').row().text('🏠 Menyu', 'main:menu');
    let message = "❓ Noto'g'ri format!\n\n";
    if (input.length > 50) {
      message += "📝 Ism juda uzun. Qisqaroq variant kiriting.";
    } else {
      message += "📝 Faqat harf va bo'shliklardan foydalaning.";
    }
    message += '\n\n💡 Masalan: Kamoliddin, Oisha, Muhammad';
    await ctx.reply(message, { reply_markup: keyboard, parse_mode: 'HTML' });
  }

  private async safeEditOrReply(ctx: BotContext, text: string, keyboard?: InlineKeyboard): Promise<void> {
    try {
      await ctx.editMessageText(text, { reply_markup: keyboard, parse_mode: 'HTML' });
    } catch {
      await ctx.reply(text, { reply_markup: keyboard, parse_mode: 'HTML' });
    }
  }

  public async handleSubscriptionSuccess(
    userId: string,
    planId: string,
    durationDays: number,
    selectedService?: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const plan = await this.planRepository.findOne({ where: { id: planId } });
    if (!user) {
      this.logger.warn(`handleSubscriptionSuccess: user ${userId} not found`);
      return;
    }

    const now = new Date();
    const end = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    user.isActive = true;
    user.subscriptionStart = now;
    user.subscriptionEnd = end;
    await this.userRepository.save(user);

    if (!user.telegramId) {
      return;
    }

    const summaryLines = [
      '🎉 <b>Tabriklaymiz!</b>',
      '',
      "✅ To'lov muvaffaqiyatli amalga oshirildi.",
      selectedService ? `🧾 Xizmat: ${selectedService}` : undefined,
      '',
      '🌟 Endi barcha premium funksiyalar ochiq!',
    ].filter(Boolean);

    await this.bot.api.sendMessage(user.telegramId, summaryLines.join('\n'), {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: '🔮 Premium menyuni ochish', callback_data: 'main:menu' }]],
      },
    });
  }
}
