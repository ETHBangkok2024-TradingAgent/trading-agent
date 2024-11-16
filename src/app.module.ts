import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigModule, ConfigService } from '@nestjs/config';
import telegramConfig from './configs/telegram.config';
import { TelegramModule } from './modules/telegram/telegram.module';
import { EncryptionService } from './modules/encryption/encryption.service';
import { OneInchModule } from './modules/1inch/oneinch.module';
import OneInchConfig from './configs/oneinch.config';
import { PositionModule } from './modules/position/position.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [telegramConfig, OneInchConfig],
      isGlobal: true,
    }),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        token: configService.get<string>('telegram.token'),
        include: [TelegramModule],
      }),
    }),
    TelegramModule,
    OneInchModule,
    PositionModule,
  ],
  controllers: [AppController],
  providers: [AppService, EncryptionService],
})
export class AppModule {}
