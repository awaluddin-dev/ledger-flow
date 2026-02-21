import { IsNumber, IsPositive, Min } from 'class-validator';

export class TopUpDto {
  @IsNumber({}, { message: 'Nominal harus berupa angka' })
  @IsPositive({ message: 'Nominal harus positif' })
  @Min(10000, { message: 'Minimal top up adalah Rp 10.000' })
  amount: number;
}
