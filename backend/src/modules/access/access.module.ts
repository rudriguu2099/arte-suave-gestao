import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AccessController } from './access.controller.js';
import { AccessService } from './access.service.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [
    PassportModule.register({}),
    UsersModule,
  ],
  controllers: [AccessController],
  providers: [AccessService],
})
export class AccessModule {}
