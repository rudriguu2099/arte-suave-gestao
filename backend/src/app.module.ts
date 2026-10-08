import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import configuration from './config/configuration.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { StudentsModule } from './modules/students/students.module.js';
import { SchoolGroupsModule } from './modules/school-groups/school-groups.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AccessModule } from './modules/access/access.module.js';
import { GroupsModule } from './modules/groups/groups.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    AccessModule,
    GroupsModule,
    StudentsModule,
    SchoolGroupsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
