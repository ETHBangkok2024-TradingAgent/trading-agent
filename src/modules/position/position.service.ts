import { Injectable } from '@nestjs/common';
import { FirebaseService, Firestore } from '../firebase/firebase.service';
import { EncryptionService } from '../encryption/encryption.service';
import { SwapService } from '../1inch/swap.service';
import { RpcService } from '../1inch/rpc.service';
import { ethers, utils } from 'ethers';
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
    console.log(group);
    // check balance
    const groupRef = this.firestore.collection('groups').doc(group);
    const data = await groupRef.get();
    const positions = data.data()?.positions || [];
    const positionIndex = positions.findIndex(
      (pos) => pos.user == Number(user),
    );
    console.log(user);
    console.log(positionIndex);
    console.log(positions[positionIndex]);
    let balance = 0;
    if (chainId === 8453) {
      balance = positions[positionIndex]?.baseBalance || 0;
    }
    console.log(balance);
    if (balance < Number(amount)) {
      throw new Error('Insufficient balance');
    }
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
    // calculate amount out from receipt
    const iface = new Interface([
      'event Transfer(address indexed from, address indexed to, uint256 value)',
    ]);
    let amountOut = '0';
    receipt.logs.forEach((log) => {
      if (log.address == tokenAddress) {
        const event = iface.decodeEventLog('Transfer', log.data, log.topics);
        if (event.to == address) {
          amountOut = event.value.toString();
        }
      }
    });
    // save swap to firestore
    const swap = {
      user: Number(user),
      side: 'buy',
      chainId,
      tokenAddress,
      amount,
      slippage,
      amountOut: utils.formatUnits(amountOut, 18),
      transactionHash,
      blockNumber,
    };
    const tokenIndex = positions[positionIndex]?.tokens.findIndex(
      (token) => token.address === tokenAddress,
    );
    if (tokenIndex === -1) {
      positions[positionIndex].tokens.push({
        address: tokenAddress,
        amount: utils.formatUnits(amountOut, 18),
      });
    } else {
      positions[positionIndex].tokens[tokenIndex].amount += utils.formatUnits(
        amountOut,
        18,
      );
    }
    await groupRef.update({
      swap_logs: [...(data.data()?.swap_logs || []), swap],
      positions,
    });
    // save position to firestore
    return { transactionHash, blockNumber };
  }
}
