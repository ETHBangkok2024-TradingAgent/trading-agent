import { Injectable } from '@nestjs/common';
import { FirebaseService, Firestore } from '../firebase/firebase.service';
import { EncryptionService } from '../encryption/encryption.service';
import { SwapService } from '../1inch/swap.service';
import { RpcService } from '../1inch/rpc.service';
import { BigNumber, ethers, utils } from 'ethers';
import { Interface } from 'ethers/lib/utils';
import { TokenService } from '../1inch/token.service';

@Injectable()
export class PositionService {
  private readonly firestore: Firestore;
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly swapService: SwapService,
    private readonly rpcService: RpcService,
    private readonly tokenService: TokenService,
  ) {
    this.firestore = this.firebaseService.getFirestore();
  }

  async getAllPositions(group: string) {
    const groupRef = this.firestore.collection('groups').doc(group);
    const data = await groupRef.get();
    const positions = data.data()?.positions || [];
    // find all token address
    const relatedTokens = data.data()?.related_tokens || [];
    const tokenMap = {};
    relatedTokens.forEach((token) => {
      tokenMap[`${token.chainId}-${token.address}`] = token;
    });
    const keys = Object.keys(tokenMap);
    while (keys.length > 0) {
      const token = tokenMap[keys.pop()];
      const { chainId, contractAddress } = token;
      const tokenInfo = await this.tokenService.getTokenInfo(
        contractAddress,
        chainId,
      );
      // const price = await this.tokenService.getPrice(
      //   [contractAddress],
      //   chainId,
      // );
      // console.log(price);
    }
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
    // check balance
    const groupRef = this.firestore.collection('groups').doc(group);
    const data = await groupRef.get();
    const positions = data.data()?.positions || [];
    const totalShare = data.data()?.totalShare || 0;
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
    // update all user Positions
    const newPositions = positions.map((pos) => {
      const tokenIndex = pos?.tokens.findIndex(
        (token) => token.address === tokenAddress,
      );
      const amountOutString = utils.formatUnits(amountOut, 18);
      const shareAmount = (Number(amountOutString) / totalShare) * pos.share;
      let existingAmount = 0;
      if (tokenIndex !== -1) {
        existingAmount = Number(pos.tokens[tokenIndex]?.amount) || 0;
      }
      const tokenAmount = existingAmount + shareAmount;
      if (tokenIndex === -1) {
        pos.tokens.push({
          address: tokenAddress,
          chainId: chainId,
          amount: tokenAmount,
        });
      } else {
        pos.tokens[tokenIndex].amount = tokenAmount;
      }
      return pos;
    });
    await groupRef.update({
      swap_logs: [...(data.data()?.swap_logs || []), swap],
      positions: newPositions,
    });
    // save position to firestore
    return { transactionHash, blockNumber };
  }
}
