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

  createProvider(chainId: number = 8453) {
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
    return provider;
  }

  async getEtherBalance(address: string, chainId: number = 8453) {
    const provider = this.createProvider(chainId);
    const balance = await provider.getBalance(address);
    return utils.formatEther(balance);
  }

  async signTransaction(privateKey: string, chainId: number, tx: any) {
    const provider = this.createProvider(chainId);
    const wallet = new ethers.Wallet(privateKey, provider);
    const nonce = await wallet.getTransactionCount();
    const transaction = {
      chainId,
      nonce,
      ...tx,
    };
    const signature = wallet.signTransaction(transaction);
    return signature;
  }

  async broadcastTransaction(chainId: number, rawTransaction: string) {
    const provider = this.createProvider(chainId);
    const result = await provider.sendTransaction(rawTransaction);
    const receipt = await result.wait();
    return receipt;
  }

  // async broadcastTransaction(chainId: number, rawTransaction: string) {
  //   const url = `https://api.1inch.dev/tx-gateway/v1.1/${chainId}/broadcast`;
  //   const response = await lastValueFrom(
  //     this.httpService.post(
  //       url,
  //       {
  //         rawTransaction,
  //       },
  //       {
  //         headers: {
  //           Authorization: `Bearer ${this.apiKey}`,
  //         },
  //       },
  //     ),
  //   );
  //   const data = response
  //   return response.data;
  // }
}
