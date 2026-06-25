import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiProperty } from '@nestjs/swagger';
import { TokenService } from '../shared/token.service';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ description: 'Refresh token yang didapat saat login' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

@ApiTags('Auth')
@Controller('auth')
export class RefreshTokenController {
  constructor(private tokenService: TokenService) {}

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh token' })
  @ApiResponse({ status: 200, description: 'Token berhasil di-refresh' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() dto: RefreshDto) {
    const payload = await this.tokenService.verifyRefreshToken(dto.refreshToken);
    return this.tokenService.generateAndSaveTokens(payload.sub, payload.email);
  }
}
