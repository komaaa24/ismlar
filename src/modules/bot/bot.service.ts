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
import { UserPaymentEntity } from '../../shared/database/entities/user-payment.entity';
import { TargetGender } from '../../shared/database/entities/user-persona-profile.entity';
import { ActivityType, PaymentStatus } from '../../shared/database/entities';
import { generatePaymeLink } from '../../shared/generators/payme-link.generator';
import { generateClickOnetimeLink } from '../../shared/generators/click-onetime-link.generator';
import { ActivityTrackerService } from './services/activity-tracker.service';

type FlowName = 'personalization' | 'quiz';

interface FlowState {
  name: FlowName;
  step: number;
  payload: Record<string, unknown>;
}

@Injectable()
export class BotService {
  // Foydalanuvchi oxirgi so'rovi uchun requested name
  private requestedNames = new Map<string, string>();
  private readonly logger = new Logger(BotService.name);
  private readonly bot = this.botCoreService.bot;
  private readonly quizFlow: QuizQuestion[];

  constructor(
    private readonly botCoreService: BotCoreService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(PlanEntity)
    private readonly planRepository: Repository<PlanEntity>,
    @InjectRepository(UserPaymentEntity)
    private readonly userPaymentRepository: Repository<UserPaymentEntity>,
    private readonly nameMeaningService: NameMeaningService,
    @Inject(forwardRef(() => NameInsightsService))
    private readonly insightsService: NameInsightsService,
    @Inject(forwardRef(() => UserFavoritesService))
    private readonly favoritesService: UserFavoritesService,
    private readonly personaService: UserPersonaService,
    private readonly adminService: AdminService,
    private readonly activityTracker: ActivityTrackerService,
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
    this.bot.command('activity', (ctx) => this.adminService.handleAdminCommand(ctx, 'activity'));
    this.bot.command('funnel', (ctx) => this.adminService.handleAdminCommand(ctx, 'funnel'));
    this.bot.command('users_active', (ctx) => this.adminService.handleAdminCommand(ctx, 'users_active'));
    this.bot.command('daily', (ctx) => this.adminService.handleAdminCommand(ctx, 'daily'));
    this.bot.command('grant', (ctx) => this.adminService.handleAdminCommand(ctx, 'grant'));
    this.bot.command('revoke', (ctx) => this.adminService.handleAdminCommand(ctx, 'revoke'));
    this.bot.command('find', (ctx) => this.adminService.handleAdminCommand(ctx, 'find'));
    this.bot.on('inline_query', (ctx) => this.handleInlineQuery(ctx));
    this.bot.on('callback_query', (ctx) => this.handleCallback(ctx));
    this.bot.on('message', (ctx) => this.handleMessage(ctx));
  }

  private async handleStart(ctx: BotContext): Promise<void> {
    await this.createUserIfNeeded(ctx);

    // Track /start command
    if (ctx.from?.id) {
      await this.activityTracker.trackActivity(
        ctx.from.id,
        ActivityType.START_COMMAND,
        { username: ctx.from.username, firstName: ctx.from.first_name }
      );
    }

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
      `✍️ <b>Ma'nosini bilmoqchi bo'lgan ismni kiriting</b>\n\n` +
      `📖 <b>Misol:</b> <code>Muhammad</code>\n` +
      `<b>Muhammad </b> (Arabcha) - Maqtovga sazovor. ` +
      `(Arabcha) - Maqtovga, olqishlarga sazovor. Payg‘ambarimiz Muhammad sollallohu alayhi vasallamning (Muhammad ibn Abdulloh, 570 yoki 571 Makka - 632, Madina) muborak ismlari..\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🌟 <b>Botimiz imkoniyatlari:</b>\n\n` +
      `🔍 <b>Ism Ma'nosi</b> - Istalgan ismning ma'nosi\n` +
      `🎯 <b>Shaxsiy Tavsiya</b> - Farzandingizga ism qo'yishga ikkilanyapsizmi?\n\n` +
      (hasAccess
        ? `✅ <b>Status:</b> VIP foydalanuvchi\n♾️ Barcha imkoniyatlar ochiq!\n\n`
        : `💳 Bir martalik to'lov - 9 999 so'm\n🌟 Bir marta to'lov qiling va 1 yillik obunaga ega bo'ling.\n\n`) +
      `📱 Pastdagi tugmalardan birini bosing yoki ismni yozing! `;

    // 🎹 Professional Reply Keyboard
    const keyboard = new Keyboard();
    keyboard.text('🔍 Ism Ma\'nosi').text('🎯 Shaxsiy Tavsiya').row();
    // keyboard.text('📊 Trendlar').text('⭐ Sevimlilar').row(); // Temporarily hidden

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
    // Handle Oferta reply keyboard button
    if (ctx.message && ctx.message.text === '📜 Oferta') {
      await this.handleOferta(ctx);
      return;
    }
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
      case 'fav':
        await this.handleFavoriteCallbacks(ctx, parts);
        break;
      case 'admin':
        await this.adminService.handleAdminCallback(ctx, parts[0] || 'panel');
        break;
      case 'main':
        await this.handleStart(ctx);
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
        // Check premium access
        if (!(await this.ensurePaidAccess(ctx))) {
          await ctx.answerCallbackQuery('Premium obuna kerak! 💳');
          return;
        }
        await this.startPersonalizationFlow(ctx);
        await ctx.answerCallbackQuery();
        break;
      case 'trends':
        // Check premium access
        if (!(await this.ensurePaidAccess(ctx))) {
          await ctx.answerCallbackQuery('Premium obuna kerak! 💳');
          return;
        }
        await this.showTrendMenu(ctx);
        await ctx.answerCallbackQuery();
        break;
      case 'oferta':
        if (ctx.from?.id) {
          await this.activityTracker.trackActivity(ctx.from.id, ActivityType.OFERTA_CLICK);
        }
        await ctx.answerCallbackQuery('📜 Oferta');
        await ctx.reply('<a href="https://telegra.ph/Ismlar-manosi-11-24">📜 Oferta (ommaviy oferta)</a>', {
          parse_mode: 'HTML',
        });
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
    // Check premium access for trends
    if (!(await this.ensurePaidAccess(ctx))) {
      await ctx.answerCallbackQuery('Premium obuna kerak! 💳');
      return;
    }

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
        if (ctx.from?.id) {
          await this.activityTracker.trackActivity(ctx.from.id, ActivityType.NAME_MEANING_CLICK);
        }
        await this.promptForName(ctx);
        return;
      case '🎯 Shaxsiy Tavsiya':
        if (ctx.from?.id) {
          await this.activityTracker.trackActivity(ctx.from.id, ActivityType.PERSONAL_TAVSIYA_CLICK);
        }
        // Check premium access
        if (!(await this.ensurePaidAccess(ctx))) {
          return;
        }
        await this.startPersonalizationFlow(ctx);
        return;
      case '📊 Trendlar':
        if (ctx.from?.id) {
          await this.activityTracker.trackActivity(ctx.from.id, ActivityType.TRENDS_CLICK);
        }
        // Check premium access
        if (!(await this.ensurePaidAccess(ctx))) {
          return;
        }
        await this.showTrendMenu(ctx);
        return;
      case '⭐ Sevimlilar':
        if (ctx.from?.id) {
          await this.activityTracker.trackActivity(ctx.from.id, ActivityType.FAVORITES_CLICK);
        }
        await this.showFavorites(ctx);
        return;
      case '💳 Premium Obuna':
        await this.showOnetimePayment(ctx);
        return;
      case '📜 Oferta':
        if (ctx.from?.id) {
          await this.activityTracker.trackActivity(ctx.from.id, ActivityType.OFERTA_CLICK);
        }
        await ctx.reply('<a href="https://telegra.ph/Ismlar-manosi-11-24">📜 Oferta (ommaviy oferta)</a>', { parse_mode: 'HTML' });
        return;
    }

    if (await this.tryHandleFlowMessage(ctx, text)) {
      return;
    }

    await this.createUserIfNeeded(ctx);

    if (this.nameMeaningService.isValidName(text)) {
      // Track name search
      if (ctx.from?.id) {
        await this.activityTracker.trackActivity(ctx.from.id, ActivityType.NAME_SEARCHED, { name: text });
      }
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
      .url('📜 Oferta', 'https://telegra.ph/Ismlar-manosi-11-24')
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
    const displayedAmount = '9 999 so\'m';
    message += hasAccess
      ? '✅ Premium foydalanuvchisiz — barcha bo\'limlar ochiq.\n\n'
      : `💳 Bir martalik to'lov qiling va 1 yillik premiumga ega bo'ling (${displayedAmount}).\n\n`;
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
    const keyboard = new InlineKeyboard().text('🏠 Menyu', 'main');
    await ctx.reply(
      '🌟 Ism ma\'nosi\n\nIltimos, qidirayotgan ismingizni yozing.\n\n💡 Masalan: Kamoliddin, Oisha, Muhammad.',
      { reply_markup: keyboard, parse_mode: 'HTML' },
    );
  }

  private async processNameMeaning(ctx: BotContext, name: string): Promise<void> {
    // Allow everyone to query name meanings without requiring premium.
    // Previously this function enforced ensurePaidAccess; that check was removed
    // so free users can get name meanings immediately.
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
      .text('🏠 Menyu', 'main');
  }

  private async showNameDetail(ctx: BotContext, slug: string): Promise<void> {
    // 🚀 API dan to'liq ma'lumot olish
    await ctx.replyWithChatAction('typing');

    const { record, meaning, error } = await this.insightsService.getRichNameMeaning(slug);

    // Agar ma'lumot topilmasa, hech narsa ko'rsatmaslik
    if (!meaning && !record) {
      await ctx.answerCallbackQuery('Ma\'lumot yuklanmoqda...');

      // Ismni to'g'ridan-to'g'ri qidirish (slug dan ism olish)
      const nameFromSlug = slug.charAt(0).toUpperCase() + slug.slice(1);
      await this.processNameMeaning(ctx, nameFromSlug);
      return;
    }

    // Ma'lumot bor - har doim bir xil format
    const displayName = record?.name || (slug.charAt(0).toUpperCase() + slug.slice(1));
    let message = this.insightsService.formatRichMeaning(
      displayName,
      meaning,
      record
    );
    message += '\n\n🔁 Yana boshqa ismni sinab ko\'ring.';

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: this.buildNameDetailKeyboard(slug),
    });

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

  private async ensurePaidAccess(
    ctx: BotContext,
    options?: { requestedName?: string },
  ): Promise<boolean> {
    const telegramId = ctx.from?.id;
    if (!telegramId) {
      await ctx.reply('Foydalanuvchi aniqlanmadi.');
      return false;
    }

    const user = await this.userRepository.findOne({ where: { telegramId } });
    if (this.userHasActiveAccess(user)) {
      return true;
    }

    if (!user) {
      await ctx.reply('/start buyrug\'ini yuboring');
      return false;
    }

    const plan = await this.planRepository.findOne({ where: { name: 'Basic' } });
    if (!plan) {
      await ctx.reply('Reja topilmadi');
      return false;
    }

    const amount = Number(plan.price ?? 0) || 9999;
    const formattedAmount = amount.toLocaleString('ru-RU');

    // Generate secure payment links with tokens
    const paymeLink = generatePaymeLink({
      amount,
      planId: plan.id,
      userId: user.id,
    });

    const clickLink = generateClickOnetimeLink(user.id, plan.id, amount, {
      planCode: plan.selectedName ?? plan.name ?? plan.id,
    });

    const keyboard = new InlineKeyboard()
      .url('💳 Payme', paymeLink)
      .url('💳 Click', clickLink)
      .row()
      .url('📜 Oferta', 'https://telegra.ph/Ismlar-manosi-11-24')
      .row()
      .text('🏠 Menyu', 'main');

    const normalizedName = options?.requestedName?.trim();
    const displayName = normalizedName
      ? normalizedName
        .split(/\s+/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ')
      : undefined;

    // Oxirgi requested name ni saqlash
    if (normalizedName && telegramId) {
      this.requestedNames.set(String(telegramId), normalizedName);
    }

    const introMessage = displayName
      ? `🔒 <b>${displayName}</b> ismini ma'nosini bilish uchun premium sotib oling.\n\n`
      : "🔒 Ushbu bo'limdan foydalanish uchun premium talab qilinadi.\n\n";

    const message = introMessage + `1 yil muddatga atigi 9999 so'm\n\nQuyidagi to'lov usulini tanlang:`;

    await ctx.reply(message, { reply_markup: keyboard, parse_mode: 'HTML' });
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
      .text('🏠 Menyu', 'main');

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
    keyboard.row().text('🏠 Menyu', 'main');

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
      .text('🏠 Menyu', 'main');

    await this.safeEditOrReply(
      ctx,
      '🌍 Jamiyat bo\'limi\n\nSevimli ismlaringizni boshqaring, so\'rovnomalarda qatnashing, do\'stlarga ulashing.',
      keyboard,
    );
  }

  private ensurePersonalizationSession(ctx: BotContext): FlowState {
    if (!ctx.session.flow || (ctx.session.flow as unknown as FlowState).name !== 'personalization') {
      ctx.session.flow = {
        name: 'personalization',
        step: 1,
        payload: { focusValues: [] },
      };
    }
    return ctx.session.flow as unknown as FlowState;
  }

  private async startPersonalizationFlow(ctx: BotContext): Promise<void> {
    this.ensurePersonalizationSession(ctx);
    const keyboard = new InlineKeyboard()
      .text('👧 Qiz bolaga', 'personal:gender:girl')
      .text("👦 O'g'il bolaga", 'personal:gender:boy')
      .row()
      .text('🏠 Menyu', 'main');

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
    const flow = ctx.session.flow as unknown as FlowState | undefined;
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
        await this.finalizePersonalization(ctx);
        return true;
      }
      default:
        return false;
    }
  }

  private async finalizePersonalization(ctx: BotContext): Promise<void> {
    const flow = ctx.session.flow as unknown as FlowState | undefined;
    if (!flow || flow.name !== 'personalization') {
      return;
    }

    const answerIfCallback = async (text?: string): Promise<void> => {
      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery(text);
      }
    };

    const telegramId = ctx.from?.id;
    if (!telegramId) {
      await answerIfCallback('Foydalanuvchi aniqlanmadi');
      return;
    }

    const user = await this.userRepository.findOne({ where: { telegramId } });
    if (!user) {
      await answerIfCallback('/start yuboring');
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
    keyboard.row().text('🏠 Menyu', 'main');

    await this.safeEditOrReply(
      ctx,
      `🎯 Profil: <b>${personaInfo.label}</b>\n${personaInfo.summary}\n\n${lines.join('\n')}`,
      keyboard,
    );

    ctx.session.flow = undefined;
    await answerIfCallback('Shaxsiy tavsiyalar tayyor!');
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
    keyboard.row().text('🏠 Menyu', 'main');

    await this.safeEditOrReply(
      ctx,
      `🧪 Savol ${index + 1}/${this.quizFlow.length}\n\n${question.text}`,
      keyboard,
    );
  }

  private async processQuizAnswer(ctx: BotContext, questionId: string, value: string): Promise<void> {
    const flow = ctx.session.flow as unknown as FlowState | undefined;
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
    keyboard.row().text('🏠 Menyu', 'main');

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
      await ctx.reply('⭐ Sevimli ismlar topilmadi. Har bir ism kartasida ⭐ tugmasini bosib qo\'shing.');
      return;
    }

    const offset = (list.page - 1) * list.pageSize;
    const lines = list.items.map((item, index) => {
      const emoji = item.gender === 'girl' ? '👧' : item.gender === 'boy' ? '👦' : '✨';
      return `${offset + index + 1}. ${emoji} ${item.name} — ${item.origin ?? ''}`;
    });

    await ctx.reply(`⭐ Sevimlilar (jami ${list.totalItems})\n\n${lines.join('\n')}`);
  }

  private async toggleFavorite(ctx: BotContext, slug: string): Promise<void> {
    // Sevimlilar funksiyasi o'chirildi
    await ctx.answerCallbackQuery('Sevimlilar funksiyasi o\'chirildi');
  }

  private async showOnetimePayment(ctx: BotContext): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) {
      await ctx.reply('Foydalanuvchi aniqlanmadi');
      return;
    }

    // Track payment screen opened
    await this.activityTracker.trackActivity(telegramId, ActivityType.PAYMENT_SCREEN_OPENED);

    const user = await this.userRepository.findOne({ where: { telegramId } });
    if (!user) {
      await ctx.reply('/start buyrug\'ini yuboring');
      return;
    }

    const plan = await this.planRepository.findOne({ where: { name: 'Basic' } });
    if (!plan) {
      await ctx.reply("Reja topilmadi");
      return;
    }


    const amount = Number(plan.price ?? 0) || 9999;
    const formattedAmount = amount.toLocaleString('ru-RU');

    const paymeLink = generatePaymeLink({
      amount,
      planId: plan.id,
      userId: user.id,
    });

    const clickLink = generateClickOnetimeLink(user.id, plan.id, amount, {
      planCode: plan.selectedName ?? plan.name ?? plan.id,
    });

    const keyboard = new InlineKeyboard()
      .url('💳 Payme', paymeLink)
      .url('💳 Click', clickLink)
      .row()
      .url('📜 Oferta', 'https://telegra.ph/Ismlar-manosi-11-24')
      .row()
      .text('🏠 Menyu', 'main');

    await ctx.reply(`1 yil muddatga atigi 9999 so'm\n\nQuyidagi to'lov usulini tanlang:`, { reply_markup: keyboard });
  }

  private async handleOnetimeProvider(ctx: BotContext, provider: 'click' | 'payme'): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) {
      await ctx.answerCallbackQuery('Foydalanuvchi aniqlanmadi');
      return;
    }

    // Track provider click
    const activityType = provider === 'click' ? ActivityType.CLICK_CLICKED : ActivityType.PAYME_CLICKED;
    await this.activityTracker.trackActivity(telegramId, activityType);

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

    const amount = Number(plan.price ?? 0) || 9999;
    const formattedAmount = amount.toLocaleString('ru-RU');
    const providerTitle = provider === 'click' ? 'Click' : 'Payme';

    const paymentLink =
      provider === 'click'
        ? generateClickOnetimeLink(user.id, plan.id, amount, {
          planCode: plan.selectedName ?? plan.name ?? plan.id,
        })
        : generatePaymeLink({
          amount,
          planId: plan.id,
          userId: user.id,
        });

    const keyboard = new InlineKeyboard()
      .url("💳 To'lovga o'tish", paymentLink)
      .row()
      .url('📜 Oferta', 'https://telegra.ph/Ismlar-manosi-11-24')
      .row()
      .text('🏠 Menyu', 'main');

    await this.safeEditOrReply(
      ctx,
      `💳 <b>${providerTitle}</b> orqali to'lov\n\n1 yil muddatga atigi 9999 so'm\n\nQuyidagi havola orqali to'lovni tasdiqlang.`,
      keyboard,
    );
    await ctx.answerCallbackQuery();
  }

  private async showNameInputHelp(ctx: BotContext, input: string): Promise<void> {
    const keyboard = new InlineKeyboard().text("🌟 Ism ma'nosi", 'name_meaning').row().text('🏠 Menyu', 'main');
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
    paymentInfo?: {
      subscriptionId?: string;
      transactionId?: string;
      amount?: number;
      currency?: string;
      paymentMethod?: string;
      status?: PaymentStatus;
    },
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

    // Track successful payment
    if (user.telegramId) {
      await this.activityTracker.trackActivity(
        user.telegramId,
        ActivityType.PAYMENT_SUCCESS,
        { planId, amount: plan?.price, provider: selectedService },
        user.id
      );
    }

    // Persist payment in user_payments for auditing
    try {
      const subscriptionId = paymentInfo?.subscriptionId ?? planId;
      if (subscriptionId) {
        await this.userPaymentRepository.save({
          userId: user.id,
          subscriptionId,
          amount: paymentInfo?.amount ?? Number(plan?.price ?? 0),
          currency: paymentInfo?.currency ?? 'UZS',
          paymentMethod: paymentInfo?.paymentMethod ?? selectedService ?? 'unknown',
          transactionId: paymentInfo?.transactionId,
          status: paymentInfo?.status ?? PaymentStatus.COMPLETED,
          paymentDate: new Date(),
        });
      } else {
        this.logger.warn(
          `handleSubscriptionSuccess: skip saving payment, missing subscriptionId for user ${user.id}`,
        );
      }
    } catch (paymentError) {
      this.logger.error(
        `Failed to persist payment for user ${user.id} and plan ${planId}`,
        paymentError as any,
      );
    }

    if (!user.telegramId) {
      return;
    }

    const message =
      '🎉 <b>Tabriklaymiz!</b>\n\n' +
      "✅ To'lov muvaffaqiyatli amalga oshirildi.\n\n" +
      "🌟 Siz 1 yillik obunaga ega bo'ldingiz.\n\n" +
      "✍️ Istalgan ismni yozing va darhol ma'nosini bilib oling.";

    await this.bot.api.sendMessage(user.telegramId, message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: '🏠 Bosh menyu', callback_data: 'main' }]],
      },
    });

    await this.sendPendingNameMeaning(user.telegramId);
  }

  /**
   * Agar foydalanuvchi to'lov oldidan ism kiritgan bo'lsa,
   * VIP faollashgandan keyin avtomatik ma'no jo'natiladi.
   */
  public async sendPendingNameMeaning(telegramId: number): Promise<void> {
    if (!telegramId) {
      return;
    }

    const mapKey = String(telegramId);
    const requestedName = this.requestedNames.get(mapKey);
    if (!requestedName) {
      return;
    }

    try {
      const { record, meaning, error } = await this.insightsService.getRichNameMeaning(requestedName);
      if (!meaning && error) {
        await this.bot.api.sendMessage(telegramId, `❌ ${error}`);
        return;
      }

      const message = this.insightsService.formatRichMeaning(record?.name ?? requestedName, meaning, record);
      await this.bot.api.sendMessage(telegramId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: '🏠 Menyu', callback_data: 'main' }]],
        },
      });
    } catch (err) {
      this.logger.warn('Requested name meaning auto-send failed', err);
    } finally {
      this.requestedNames.delete(mapKey);
    }
  }
}
