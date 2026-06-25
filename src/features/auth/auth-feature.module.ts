import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from 'src/auth/jwt.strategy';
import { TokenService } from './shared/token.service';
import { RegisterController } from './register/register.controller';
import { LoginController } from './login/login.controller';
import { RefreshTokenController } from './refresh-token/refresh-token.controller';
import { GetProfileController } from './get-profile/get-profile.controller';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [
    RegisterController,
    LoginController,
    RefreshTokenController,
    GetProfileController,
  ],
  providers: [TokenService, JwtStrategy],
})
export class AuthFeatureModule {}
