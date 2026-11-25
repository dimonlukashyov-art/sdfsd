package com.edgerunner.berserk;

import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.util.Mth;
import net.minecraft.util.RandomSource;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.phys.Vec3;

public final class BerserkHeatFx {
   private BerserkHeatFx() {
   }

   public static void emitServer(LivingEntity entity, ServerLevel level) {
      if (entity.f_19797_ % 3 == 0) {
         RandomSource random = entity.m_217043_();
         Vec3[] vents = vents(entity);
         int puffs = 2;

         for(int i = 0; i < puffs; ++i) {
            Vec3 point = vents[random.m_188503_(vents.length)];
            double x = point.f_82479_ + (random.m_188500_() - (double)0.5F) * 0.1;
            double y = point.f_82480_ + (random.m_188500_() - (double)0.5F) * 0.06;
            double z = point.f_82481_ + (random.m_188500_() - (double)0.5F) * 0.1;
            level.m_8767_(ParticleTypes.f_123777_, x, y, z, 0, (random.m_188500_() - (double)0.5F) * 0.01, 0.045 + random.m_188500_() * 0.02, (random.m_188500_() - (double)0.5F) * 0.01, (double)1.0F);
         }

      }
   }

   private static Vec3[] vents(LivingEntity entity) {
      float yaw = entity.f_20883_ * ((float)Math.PI / 180F);
      double forwardX = (double)(-Mth.m_14031_(yaw));
      double forwardZ = (double)Mth.m_14089_(yaw);
      double rightX = -forwardZ;
      Vec3 origin = entity.m_20182_();
      double height = (double)entity.m_20206_();
      double skin = Math.max(0.16, (double)entity.m_20205_() * 0.38);
      return new Vec3[]{origin.m_82520_((double)0.0F, height * 0.82, (double)0.0F), origin.m_82520_(rightX * skin, height * 0.72, forwardX * skin), origin.m_82520_(-rightX * skin, height * 0.72, -forwardX * skin), origin.m_82520_(forwardX * skin * 0.7, height * 0.56, forwardZ * skin * 0.7), origin.m_82520_(-forwardX * skin * 0.35, height * (double)0.5F, -forwardZ * skin * 0.35), origin.m_82520_(rightX * skin * (double)0.5F, height * 0.3, forwardX * skin * (double)0.5F), origin.m_82520_(-rightX * skin * (double)0.5F, height * 0.3, -forwardX * skin * (double)0.5F)};
   }
}
