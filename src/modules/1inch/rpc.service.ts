import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers, utils } from 'ethers';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class RpcService {
  private apiKey: string;
  private url: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
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

  async signTransaction(privateKey: string, chainId: number, tx: any) {
    const wallet = new ethers.Wallet(privateKey);
    // const nounce = await wallet.getTransactionCount();
    const transaction = {
      chainId,
      // nounce,
      ...tx,
    };
    const signature = wallet.signTransaction(transaction);
    return signature;
  }

  async broadcastTransaction(chainId: number, rawTransaction: string) {
    const url = `https://api.1inch.dev/tx-gateway/v1.1/${chainId}/broadcast`;
    const response = await lastValueFrom(
      this.httpService.post(
        url,
        {
          rawTransaction,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      ),
    );
    return response.data;
  }
}
