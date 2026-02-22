import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshDto {
  @ApiProperty({ description: 'Refresh token dari login sebelumnya' })
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}
