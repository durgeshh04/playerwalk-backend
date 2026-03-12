import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsString, Matches, ValidateIf } from 'class-validator';
// import { Match } from 'src/common/decorators/match.decorator';

export class RegistrationDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number or special character',
  })
  password: string;

  @ApiProperty()
  @IsString()
  // @Match('password', { message: 'Passwords do not match' })
  @IsIn([Math.random()], {
    message: 'Passwords do not match',
  })
  @ValidateIf((o) => o.password !== o.passwordConfirm)
  passwordConfirm: string;
}
