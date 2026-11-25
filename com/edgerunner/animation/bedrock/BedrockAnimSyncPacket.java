package com.edgerunner.animation.bedrock;

import com.edgerunner.client.animation.bedrock.BedrockAnimClientState;
import java.util.UUID;
import java.util.function.Supplier;
import net.minecraft.network.FriendlyByteBuf;
import net.minecraft.resources.ResourceLocation;
import net.minecraftforge.fml.LogicalSide;
import net.minecraftforge.network.NetworkEvent;

public record BedrockAnimSyncPacket(int entityId, UUID playerId, boolean active, ResourceLocation animationId, long startTick, boolean loop, float speed) {
   private static final ResourceLocation EMPTY_ID = ResourceLocation.fromNamespaceAndPath("minecraft", "empty");

   public BedrockAnimSyncPacket(int entityId, UUID playerId, boolean active, ResourceLocation animationId, long startTick, boolean loop, float speed) {
      animationId = animationId == null ? EMPTY_ID : animationId;
      if (Float.isNaN(speed) || speed <= 0.0F) {
         speed = 1.0F;
      }

      this.entityId = entityId;
      this.playerId = playerId;
      this.active = active;
      this.animationId = animationId;
      this.startTick = startTick;
      this.loop = loop;
      this.speed = speed;
   }

   public static BedrockAnimSyncPacket stopped(int entityId, UUID playerId) {
      return new BedrockAnimSyncPacket(entityId, playerId, false, EMPTY_ID, 0L, false, 1.0F);
   }

   public static void encode(BedrockAnimSyncPacket msg, FriendlyByteBuf buf) {
      buf.m_130130_(msg.entityId());
      buf.m_130077_(msg.playerId() == null ? new UUID(0L, 0L) : msg.playerId());
      buf.writeBoolean(msg.active());
      buf.m_130072_(msg.animationId().toString(), 256);
      buf.writeLong(msg.startTick());
      buf.writeBoolean(msg.loop());
      buf.writeFloat(msg.speed());
   }

   public static BedrockAnimSyncPacket decode(FriendlyByteBuf buf) {
      int entityId = buf.m_130242_();
      UUID playerId = buf.m_130259_();
      boolean active = buf.readBoolean();
      ResourceLocation animationId = ResourceLocation.m_135820_(buf.m_130136_(256));
      long startTick = buf.readLong();
      boolean loop = buf.readBoolean();
      float speed = buf.readFloat();
      return new BedrockAnimSyncPacket(entityId, playerId, active, animationId, startTick, loop, speed);
   }

   public static void handle(BedrockAnimSyncPacket msg, Supplier<NetworkEvent.Context> ctx) {
      NetworkEvent.Context context = (NetworkEvent.Context)ctx.get();
      if (context.getDirection().getReceptionSide() != LogicalSide.CLIENT) {
         context.setPacketHandled(true);
      } else {
         context.enqueueWork(() -> BedrockAnimClientState.applySync(msg));
         context.setPacketHandled(true);
      }
   }
}
