import { Injectable } from '@nestjs/common';
import { FirebaseService, Firestore } from '../firebase/firebase.service';
import { EncryptionService } from '../encryption/encryption.service';
import { SwapService } from '../1inch/swap.service';
import { RpcService } from '../1inch/rpc.service';
import { ethers } from 'ethers';
import { Interface } from 'ethers/lib/utils';

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
    group: string,
    user: string,
    chainId: number,
    tokenAddress: string,
    amount: string,
    slippage: number,
    privateKey: string,
  ) {
    // swap
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
    console.log(receipt);
    // calculate amount out from receipt
    const iface = new Interface([
      'event Transfer(address indexed from, address indexed to, uint256 value)',
    ]);
    let amountOut = '0';
    receipt.logs.forEach((log) => {
      if (log.address == tokenAddress) {
        const event = iface.decodeEventLog('Transfer', log.data, log.topics);
        console.log(event);
        if (event.to == address) {
          amountOut = event.value.toString();
        }
      }
    });
    // save swap to firestore
    const swap = {
      user,
      group,
      side: 'buy',
      chainId,
      tokenAddress,
      amount,
      slippage,
      amountOut,
      transactionHash,
      blockNumber,
    };
    const swapRef = this.firestore.collection('swaps').doc();
    const result = await swapRef.set(swap);
    console.log(result);
    // save position to firestore
    // const positionId = `${group}_${user}`;
    // const positionRef = this.firestore.collection('positions').doc();
    return { transactionHash, blockNumber };
  }
}
