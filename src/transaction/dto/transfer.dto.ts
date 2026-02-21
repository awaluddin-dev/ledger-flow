import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  Min,
} from 'class-validator';

export class TransferDto {
  @IsEmail({}, { message: 'Format email penerima salah' })
  @IsNotEmpty()
  targetEmail: string;

  @IsNumber({}, { message: 'Nominal harus berupa angka' })
  @IsPositive({ message: 'Nominal harus positif' })
  @Min(10000, { message: 'Minimal transfer adalah Rp 10.000' })
  amount: number;
}
