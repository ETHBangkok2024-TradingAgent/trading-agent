import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class PortfolioService {
  private apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('1inch.apiKey');
  }

  async getCurrentValue(address: string, chainId: number) {
    const url =
      'https://api.1inch.dev/portfolio/portfolio/v4/overview/erc20/current_value';
    const response = await lastValueFrom(
      this.httpService.get(url, {
        params: {
          addresses: [address],
          chainId,
        },
        paramsSerializer: {
          indexes: null,
        },
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      }),
    );
    const data = response.data;
    return data;
  }

  async getBalance(address: string) {
    const url = `https://api.1inch.dev/balance/v1.2/1/balances/${address}`;
    const response = await lastValueFrom(
      this.httpService.get(url, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      }),
    );
    const data = response.data;
    const tokens = [];
    const keys = Object.keys(data);
    for (const key of keys) {
      const balance = Number(data[key]);
      if (balance > 0) {
        tokens.push({
          address: key,
          balance,
        });
      }
    }
    return tokens;
  }
}
