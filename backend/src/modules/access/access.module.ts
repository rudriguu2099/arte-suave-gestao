import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { AccessController } from './access.controller.js';
import { AccessService } from './access.service.js';
import { Student } from './entities/student.entity.js';
import { SchoolGroup } from './entities/school-group.entity.js';
import { UsersModule } from '../users/users.module.js';
import { User } from '../users/entities/user.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Student, SchoolGroup]),
    PassportModule.register({}),
    UsersModule,
  ],
  controllers: [AccessController],
  providers: [AccessService],
})
export class AccessModule {}
