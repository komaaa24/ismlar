import { Repository } from 'typeorm';
import { PlanEntity } from '../entities/plan.entity';
import logger from '../../utils/logger';

export async function seedBasicPlan(
  planRepository: Repository<PlanEntity>,
): Promise<void> {
  try {
    // Seed Basic plan (lifetime access)
    const existingBasicPlan = await planRepository.findOne({
      where: { name: 'Basic' },
    });

    if (!existingBasicPlan) {
      const basicPlan = planRepository.create({
        name: 'Basic',
        selectedName: 'basic',
        price: 9999, // 9 999 so'm
        duration: 365, // 1 yil (kunlarda)
      });
      await planRepository.save(basicPlan);
      logger.info('✅ Basic plan seeded successfully');
    } else {
      logger.info('✅ Plans already exist');
    }
  } catch (error) {
    logger.error('❌ Error seeding basic plan:', error);
    throw error;
  }
}
