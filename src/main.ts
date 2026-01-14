import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { AppModule } from './app.module';
import logger from './shared/utils/logger';
import { DataSource } from 'typeorm';
import { PlanEntity } from './shared/database/entities/plan.entity';
import { seedBasicPlan } from './shared/database/seeders/plan.seeder';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Порт строго number
  const rawPort = configService.get<string>('APP_PORT', '9990');
  const port = Number.parseInt(rawPort, 10) || 9990;

  // Префикс API
  const apiPrefix = configService.get<string>('API_PREFIX', 'api');
  app.setGlobalPrefix(apiPrefix);

  // Сидеры/статика/CORS
  const dataSource = app.get(DataSource);
  const planRepository = dataSource.getRepository(PlanEntity);
  await seedBasicPlan(planRepository);

  app.useStaticAssets(join(process.cwd(), 'public'));
  app.setViewEngine('ejs');
  app.setBaseViewsDir(join(process.cwd(), 'view'));
  app.enableCors({ origin: true, methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', credentials: true });

  try {
    // 1) Низкоуровневый listen (как test-server.js)
    const server: any = app.getHttpServer();

    console.log('>>> low-level listen start', { port, host: '0.0.0.0' });
    await new Promise<void>((resolve, reject) => {
      server.once('error', (err: any) => {
        console.error('❌ httpServer error:', err?.code || err?.message || err);
        reject(err);
      });
      server.listen(port, '0.0.0.0', () => resolve());
    });

    const addr = server.address();
    console.log('>>> server.address():', addr); // { address:'0.0.0.0', family:'IPv4', port: 9990 }
    logger.info(`✅ TCP socket bound on 0.0.0.0:${port}`);

    // 2) Инициализируем Nest в фоне, чтобы сеть уже работала
    (async () => {
      console.log('>>> init app (background)');
      await app.init();
      const urlFromNest = await app.getUrl();
      const base = (process.env.PUBLIC_URL?.trim() || urlFromNest).replace(/\/$/, '');
      logger.info(`✅ Application initialized: ${base} (prefix: /${apiPrefix})`);
      console.log(`✅ Application initialized: ${base} (prefix: /${apiPrefix})`);
      console.log(`🔍 API: ${base}/${apiPrefix}`);
    })().catch((e) => {
      logger.error('❌ app.init() failed', e as any);
      console.error('❌ app.init() failed:', (e as any)?.message || e);
    });
  } catch (error) {
    logger.error(`❌ Failed to start on 0.0.0.0:${port}`, error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  logger.error('Fatal error during bootstrap', error);
  process.exit(1);
});
