import { IsEmail, IsNotEmpty, MinLength, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'Awaluddin Architect',
    description: 'Nama lengkap user',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'awal@architect.com',
    description: 'Email unik user',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'passwordkuat123', minLength: 8 })
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
