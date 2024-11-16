import { Injectable } from '@nestjs/common';
import { FirebaseService, Firestore } from '../firebase/firebase.service';
import { EncryptionService } from '../encryption/encryption.service';
import { SwapService } from '../1inch/swap.service';
import { RpcService } from '../1inch/rpc.service';
import { ethers } from 'ethers';

@Injectable()
export class PositionService {
  private readonly firestore: Firestore;
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly swapService: SwapService,
    private readonly rpcService: RpcService,
  ) {
    this.firestore = this.firebaseService.getFirestore();
  }

  async buy(
    chainId: number,
    tokenAddress: string,
    amount: string,
    slippage: number,
    privateKey: string,
  ) {
    const wallet = new ethers.Wallet(privateKey);
    const address = wallet.address;
    const tx = await this.swapService.generateCallDataForSwap(
      chainId,
      '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      tokenAddress,
      amount,
      address,
      slippage,
    );
    const raw = await this.rpcService.signTransaction(privateKey, chainId, tx);
    const receipt = await this.rpcService.broadcastTransaction(chainId, raw);
    const { transactionHash, blockNumber } = receipt;
    return { transactionHash, blockNumber };
  }
}
