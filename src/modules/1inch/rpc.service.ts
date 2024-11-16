import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers, utils } from 'ethers';

@Injectable()
export class RpcService {
  private apiKey: string;
  private url: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('1inch.apiKey');
  }

  async getEtherBalance(address: string, chainId: number = 8453) {
    const url = `https://api.1inch.dev/web3/${chainId}/full`;
    const provider = new ethers.providers.JsonRpcProvider({
      url,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });
    const balance = await provider.getBalance(address);
    return utils.formatEther(balance);
  }
}
