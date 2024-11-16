import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { utils, BigNumber } from 'ethers';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class SwapService {
  private apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('1inch.apiKey');
  }

  async getQuote(
    chainId: number,
    fromToken: string = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    toToken: string,
    amount: string,
    sourceDecimal: number = 18,
  ) {
    const url = `https://api.1inch.dev/swap/v6.0/${chainId}/quote`;
    const ethAmount = utils.parseUnits(amount, sourceDecimal);
    const response = await lastValueFrom(
      this.httpService.get(url, {
        params: {
          src: fromToken,
          dst: toToken,
          amount: ethAmount,
        },
        paramsSerializer: {
          indexes: null,
        },
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      }),
    );
    return response.data;
  }

  async generateCallDataForSwap(
    chainId: number,
    src: string,
    dst: string,
    amount: string,
    from: string,
    slippage: number,
    sourceDecimal: number = 18,
  ) {
    const url = `https://api.1inch.dev/swap/v6.0/${chainId}/swap`;
    const ethAmount = utils.parseUnits(amount, sourceDecimal);
    const response = await lastValueFrom(
      this.httpService.get(url, {
        params: {
          src,
          dst,
          amount: ethAmount,
          from,
          origin: from,
          slippage,
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
    const tx = data.tx;
    const transaction = {
      to: tx.to,
      data: tx.data,
      value: BigNumber.from(tx.value),
      gasPrice: BigNumber.from(tx.gasPrice),
      gasLimit: utils.hexlify(tx.gas),
      chainId,
    };
    return transaction;
  }
}
