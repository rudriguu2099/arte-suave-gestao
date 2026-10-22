import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard.js';
import { FinanceService } from './finance.service.js';
import { CostAidQueryDto, ExpenseDto, RevenueDto, UpdateExpenseDto, UpdateRevenueDto } from './dto/finance.dto.js';

// Valores saem como number e datas como DD/MM/AAAA.
@ApiTags('finance')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido, expirado ou conta inativa' })
@ApiForbiddenResponse({ description: 'Somente o superadmin acessa o financeiro' })
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly service: FinanceService) {}

  @ApiOperation({ summary: 'Relação mensal de ajuda de custo por atleta (HU017 / RF014)' })
  @ApiOkResponse({ description: 'Atletas ativos divididos em contributed e pending no mês/ano de referência' })
  @Get('cost-aid')
  listCostAid(@Query() query: CostAidQueryDto) {
    return this.service.listCostAid(query);
  }

  @ApiOperation({ summary: 'Lista as receitas, mais recentes primeiro (RF012)' })
  @ApiOkResponse({ description: 'Receitas com o atleta vinculado (id e nome), quando houver' })
  @Get('revenues')
  listRevenues() {
    return this.service.listRevenues();
  }

  @ApiOperation({
    summary: 'Registra uma receita (HU015 / HU018 / RF012)',
    description: 'title é obrigatório em OUTROS. donor é obrigatório em PATROCINIO_DOACAO. studentId é gravado em AJUDA_DE_CUSTO e PATROCINIO_DOACAO.',
  })
  @ApiCreatedResponse({ description: 'Receita registrada' })
  @ApiBadRequestResponse({ description: 'Dados inválidos: categoria, valor, data, forma de recebimento ou título ausente em OUTROS' })
  @ApiNotFoundResponse({ description: 'Atleta não encontrado' })
  @Post('revenues')
  createRevenue(@Body() dto: RevenueDto) {
    return this.service.createRevenue(dto);
  }

  @ApiOperation({
    summary: 'Edita uma receita (RF012)',
    description: 'Envie só os campos que mudam; o resto é mantido. studentId: null desvincula o atleta.',
  })
  @ApiParam({ name: 'id', description: 'id da receita' })
  @ApiOkResponse({ description: 'Receita atualizada' })
  @ApiBadRequestResponse({ description: 'Dados inválidos ou id não UUID' })
  @ApiNotFoundResponse({ description: 'Receita ou atleta não encontrado' })
  @Patch('revenues/:id')
  updateRevenue(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRevenueDto) {
    return this.service.updateRevenue(id, dto);
  }

  @ApiOperation({ summary: 'Exclui uma receita (RF012)' })
  @ApiParam({ name: 'id', description: 'id da receita' })
  @ApiNoContentResponse({ description: 'Receita excluída' })
  @ApiBadRequestResponse({ description: 'id não é um UUID' })
  @ApiNotFoundResponse({ description: 'Receita não encontrada' })
  @Delete('revenues/:id')
  @HttpCode(204)
  removeRevenue(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeRevenue(id);
  }

  @ApiOperation({ summary: 'Lista as despesas, mais recentes primeiro (RF013)' })
  @ApiOkResponse({ description: 'Despesas' })
  @Get('expenses')
  listExpenses() {
    return this.service.listExpenses();
  }

  @ApiOperation({ summary: 'Registra uma despesa (HU016 / RF013)', description: 'title é obrigatório em OUTROS.' })
  @ApiCreatedResponse({ description: 'Despesa registrada' })
  @ApiBadRequestResponse({ description: 'Dados inválidos: categoria, valor, data, situação ou título ausente em OUTROS' })
  @Post('expenses')
  createExpense(@Body() dto: ExpenseDto) {
    return this.service.createExpense(dto);
  }

  @ApiOperation({ summary: 'Edita uma despesa (RF013)', description: 'Envie só os campos que mudam; o resto é mantido.' })
  @ApiParam({ name: 'id', description: 'id da despesa' })
  @ApiOkResponse({ description: 'Despesa atualizada' })
  @ApiBadRequestResponse({ description: 'Dados inválidos ou id não UUID' })
  @ApiNotFoundResponse({ description: 'Despesa não encontrada' })
  @Patch('expenses/:id')
  updateExpense(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateExpenseDto) {
    return this.service.updateExpense(id, dto);
  }

  @ApiOperation({ summary: 'Exclui uma despesa (RF013)' })
  @ApiParam({ name: 'id', description: 'id da despesa' })
  @ApiNoContentResponse({ description: 'Despesa excluída' })
  @ApiBadRequestResponse({ description: 'id não é um UUID' })
  @ApiNotFoundResponse({ description: 'Despesa não encontrada' })
  @Delete('expenses/:id')
  @HttpCode(204)
  removeExpense(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeExpense(id);
  }
}
