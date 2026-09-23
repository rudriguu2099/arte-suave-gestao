import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { User } from './entities/user.entity.js';
import { UsersSeed } from './user.seed.js';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [TypeOrmModule.forFeature([User]), PassportModule.register({}), ConfigModule],
  controllers: [UsersController],
  providers: [UsersService, UsersSeed],
  exports: [UsersService],
})
export class UsersModule {}
