import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class TokenService {
  private apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('1inch.apiKey');
  }

  async getTokenInfo(addresses: string[], chainId: number) {
    const url = `https://api.1inch.dev/token/v1.2/${chainId}/custom/${addresses.join(
      ',',
    )}`;
    const response = await lastValueFrom(
      this.httpService.get(url, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      }),
    );
    const data = response.data;
    return data;
  }
}
