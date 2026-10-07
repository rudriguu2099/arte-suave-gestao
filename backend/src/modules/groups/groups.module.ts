import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { GroupsController } from './groups.controller.js';
import { GroupsService } from './groups.service.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [PassportModule.register({}), UsersModule],
  controllers: [GroupsController],
  providers: [GroupsService],
})
export class GroupsModule {}
