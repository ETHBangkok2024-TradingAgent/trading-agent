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
    let url = `https://api.1inch.dev/web3/${chainId}/full`;
    if (chainId === 534352) {
      url = `https://rpc.scroll.io`;
    }
    if (chainId === 59144) {
      url = `https://linea.drpc.org`;
    }
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
