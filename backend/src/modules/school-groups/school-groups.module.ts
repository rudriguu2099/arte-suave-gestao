import { Module } from '@nestjs/common';
import { SchoolGroupsController } from './school-groups.controller.js';
import { SchoolGroupsService } from './school-groups.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
    imports: [AuthModule],
    controllers: [SchoolGroupsController],
    providers: [SchoolGroupsService],
})
export class SchoolGroupsModule {}