import { Injectable } from '@nestjs/common';
import { FirebaseService, Firestore } from '../firebase/firebase.service';
import { Contract, ethers } from 'ethers';
import { Interface } from 'ethers/lib/utils';

@Injectable()
export class SwapScrollService {
  private readonly firestore: Firestore;
  constructor(private readonly firebaseService: FirebaseService) {
    this.firestore = this.firebaseService.getFirestore();
  }
  private readonly UNISWAP_ROUTER_ADDRESS =
    '0x2da10A1e27bF85cEdD8FFb1AbBe97e53391C0295';
  private readonly UNISWAP_ROUTER_ABI = [
    {
      inputs: [
        {
          internalType: 'address',
          name: '_factory',
          type: 'address',
        },
        {
          internalType: 'address',
          name: '_WFLOW',
          type: 'address',
        },
      ],
      stateMutability: 'nonpayable',
      type: 'constructor',
    },
    {
      inputs: [],
      name: 'WFLOW',
      outputs: [
        {
          internalType: 'address',
          name: '',
          type: 'address',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'tokenA',
          type: 'address',
        },
        {
          internalType: 'address',
          name: 'tokenB',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'amountADesired',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'amountBDesired',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'amountAMin',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'amountBMin',
          type: 'uint256',
        },
        {
          internalType: 'address',
          name: 'to',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'deadline',
          type: 'uint256',
        },
      ],
      name: 'addLiquidity',
      outputs: [
        {
          internalType: 'uint256',
          name: 'amountA',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'amountB',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'liquidity',
          type: 'uint256',
        },
      ],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'token',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'amountTokenDesired',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'amountTokenMin',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'amountETHMin',
          type: 'uint256',
        },
        {
          internalType: 'address',
          name: 'to',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'deadline',
          type: 'uint256',
        },
      ],
      name: 'addLiquidityETH',
      outputs: [
        {
          internalType: 'uint256',
          name: 'amountToken',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'amountETH',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'liquidity',
          type: 'uint256',
        },
      ],
      stateMutability: 'payable',
      type: 'function',
    },
    {
      inputs: [],
      name: 'factory',
      outputs: [
        {
          internalType: 'address',
          name: '',
          type: 'address',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'amountOut',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'reserveIn',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'reserveOut',
          type: 'uint256',
        },
      ],
      name: 'getAmountIn',
      outputs: [
        {
          internalType: 'uint256',
          name: 'amountIn',
          type: 'uint256',
        },
      ],
      stateMutability: 'pure',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'amountIn',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'reserveIn',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'reserveOut',
          type: 'uint256',
        },
      ],
      name: 'getAmountOut',
      outputs: [
        {
          internalType: 'uint256',
          name: 'amountOut',
          type: 'uint256',
        },
      ],
      stateMutability: 'pure',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'amountOut',
          type: 'uint256',
        },
        {
          internalType: 'address[]',
          name: 'path',
          type: 'address[]',
        },
      ],
      name: 'getAmountsIn',
      outputs: [
        {
          internalType: 'uint256[]',
          name: 'amounts',
          type: 'uint256[]',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'amountIn',
          type: 'uint256',
        },
        {
          internalType: 'address[]',
          name: 'path',
          type: 'address[]',
        },
      ],
      name: 'getAmountsOut',
      outputs: [
        {
          internalType: 'uint256[]',
          name: 'amounts',
          type: 'uint256[]',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'amountA',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'reserveA',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'reserveB',
          type: 'uint256',
        },
      ],
      name: 'quote',
      outputs: [
        {
          internalType: 'uint256',
          name: 'amountB',
          type: 'uint256',
        },
      ],
      stateMutability: 'pure',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'tokenA',
          type: 'address',
        },
        {
          internalType: 'address',
          name: 'tokenB',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'liquidity',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'amountAMin',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'amountBMin',
          type: 'uint256',
        },
        {
          internalType: 'address',
          name: 'to',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'deadline',
          type: 'uint256',
        },
      ],
      name: 'removeLiquidity',
      outputs: [
        {
          internalType: 'uint256',
          name: 'amountA',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'amountB',
          type: 'uint256',
        },
      ],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'token',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'liquidity',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'amountTokenMin',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'amountETHMin',
          type: 'uint256',
        },
        {
          internalType: 'address',
          name: 'to',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'deadline',
          type: 'uint256',
        },
      ],
      name: 'removeLiquidityETH',
      outputs: [
        {
          internalType: 'uint256',
          name: 'amountToken',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'amountETH',
          type: 'uint256',
        },
      ],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'token',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'liquidity',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'amountTokenMin',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'amountETHMin',
          type: 'uint256',
        },
        {
          internalType: 'address',
          name: 'to',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'deadline',
          type: 'uint256',
        },
      ],
      name: 'removeLiquidityETHSupportingFeeOnTransferTokens',
      outputs: [
        {
          internalType: 'uint256',
          name: 'amountETH',
          type: 'uint256',
        },
      ],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'token',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'liquidity',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'amountTokenMin',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'amountETHMin',
          type: 'uint256',
        },
        {
          internalType: 'address',
          name: 'to',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'deadline',
          type: 'uint256',
        },
        {
          internalType: 'bool',
          name: 'approveMax',
          type: 'bool',
        },
        {
          internalType: 'uint8',
          name: 'v',
          type: 'uint8',
        },
        {
          internalType: 'bytes32',
          name: 'r',
          type: 'bytes32',
        },
        {
          internalType: 'bytes32',
          name: 's',
          type: 'bytes32',
        },
      ],
      name: 'removeLiquidityETHWithPermit',
      outputs: [
        {
          internalType: 'uint256',
          name: 'amountToken',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'amountETH',
          type: 'uint256',
        },
      ],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'token',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'liquidity',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'amountTokenMin',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'amountETHMin',
          type: 'uint256',
        },
        {
          internalType: 'address',
          name: 'to',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'deadline',
          type: 'uint256',
        },
        {
          internalType: 'bool',
          name: 'approveMax',
          type: 'bool',
        },
        {
          internalType: 'uint8',
          name: 'v',
          type: 'uint8',
        },
        {
          internalType: 'bytes32',
          name: 'r',
          type: 'bytes32',
        },
        {
          internalType: 'bytes32',
          name: 's',
          type: 'bytes32',
        },
      ],
      name: 'removeLiquidityETHWithPermitSupportingFeeOnTransferTokens',
      outputs: [
        {
          internalType: 'uint256',
          name: 'amountETH',
          type: 'uint256',
        },
      ],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'tokenA',
          type: 'address',
        },
        {
          internalType: 'address',
          name: 'tokenB',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'liquidity',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'amountAMin',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'amountBMin',
          type: 'uint256',
        },
        {
          internalType: 'address',
          name: 'to',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'deadline',
          type: 'uint256',
        },
        {
          internalType: 'bool',
          name: 'approveMax',
          type: 'bool',
        },
        {
          internalType: 'uint8',
          name: 'v',
          type: 'uint8',
        },
        {
          internalType: 'bytes32',
          name: 'r',
          type: 'bytes32',
        },
        {
          internalType: 'bytes32',
          name: 's',
          type: 'bytes32',
        },
      ],
      name: 'removeLiquidityWithPermit',
      outputs: [
        {
          internalType: 'uint256',
          name: 'amountA',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'amountB',
          type: 'uint256',
        },
      ],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'amountOut',
          type: 'uint256',
        },
        {
          internalType: 'address[]',
          name: 'path',
          type: 'address[]',
        },
        {
          internalType: 'address',
          name: 'to',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'deadline',
          type: 'uint256',
        },
      ],
      name: 'swapETHForExactTokens',
      outputs: [
        {
          internalType: 'uint256[]',
          name: 'amounts',
          type: 'uint256[]',
        },
      ],
      stateMutability: 'payable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'amountOutMin',
          type: 'uint256',
        },
        {
          internalType: 'address[]',
          name: 'path',
          type: 'address[]',
        },
        {
          internalType: 'address',
          name: 'to',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'deadline',
          type: 'uint256',
        },
      ],
      name: 'swapExactETHForTokens',
      outputs: [
        {
          internalType: 'uint256[]',
          name: 'amounts',
          type: 'uint256[]',
        },
      ],
      stateMutability: 'payable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'amountOutMin',
          type: 'uint256',
        },
        {
          internalType: 'address[]',
          name: 'path',
          type: 'address[]',
        },
        {
          internalType: 'address',
          name: 'to',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'deadline',
          type: 'uint256',
        },
      ],
      name: 'swapExactETHForTokensSupportingFeeOnTransferTokens',
      outputs: [],
      stateMutability: 'payable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'amountIn',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'amountOutMin',
          type: 'uint256',
        },
        {
          internalType: 'address[]',
          name: 'path',
          type: 'address[]',
        },
        {
          internalType: 'address',
          name: 'to',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'deadline',
          type: 'uint256',
        },
      ],
      name: 'swapExactTokensForETH',
      outputs: [
        {
          internalType: 'uint256[]',
          name: 'amounts',
          type: 'uint256[]',
        },
      ],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'amountIn',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'amountOutMin',
          type: 'uint256',
        },
        {
          internalType: 'address[]',
          name: 'path',
          type: 'address[]',
        },
        {
          internalType: 'address',
          name: 'to',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'deadline',
          type: 'uint256',
        },
      ],
      name: 'swapExactTokensForETHSupportingFeeOnTransferTokens',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'amountIn',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'amountOutMin',
          type: 'uint256',
        },
        {
          internalType: 'address[]',
          name: 'path',
          type: 'address[]',
        },
        {
          internalType: 'address',
          name: 'to',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'deadline',
          type: 'uint256',
        },
      ],
      name: 'swapExactTokensForTokens',
      outputs: [
        {
          internalType: 'uint256[]',
          name: 'amounts',
          type: 'uint256[]',
        },
      ],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'amountIn',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'amountOutMin',
          type: 'uint256',
        },
        {
          internalType: 'address[]',
          name: 'path',
          type: 'address[]',
        },
        {
          internalType: 'address',
          name: 'to',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'deadline',
          type: 'uint256',
        },
      ],
      name: 'swapExactTokensForTokensSupportingFeeOnTransferTokens',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'amountOut',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'amountInMax',
          type: 'uint256',
        },
        {
          internalType: 'address[]',
          name: 'path',
          type: 'address[]',
        },
        {
          internalType: 'address',
          name: 'to',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'deadline',
          type: 'uint256',
        },
      ],
      name: 'swapTokensForExactETH',
      outputs: [
        {
          internalType: 'uint256[]',
          name: 'amounts',
          type: 'uint256[]',
        },
      ],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'amountOut',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'amountInMax',
          type: 'uint256',
        },
        {
          internalType: 'address[]',
          name: 'path',
          type: 'address[]',
        },
        {
          internalType: 'address',
          name: 'to',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'deadline',
          type: 'uint256',
        },
      ],
      name: 'swapTokensForExactTokens',
      outputs: [
        {
          internalType: 'uint256[]',
          name: 'amounts',
          type: 'uint256[]',
        },
      ],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      stateMutability: 'payable',
      type: 'receive',
    },
  ];
  private readonly provider = new ethers.providers.JsonRpcProvider(
    'https://scroll.drpc.org',
  );

  async buy(
    group: string,
    user: string,
    tokenAddress: string,
    amount: string,
    slippage: number,
    privateKey: string,
  ) {
    const wallet = new ethers.Wallet(privateKey);
    const address = wallet.address;
    const signer = wallet.connect(this.provider);

    const routerContract = new Contract(
      this.UNISWAP_ROUTER_ADDRESS, // Need this
      this.UNISWAP_ROUTER_ABI, // Need this
      signer,
    );

    const path = [
      '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // WETH
      tokenAddress,
    ];

    const deadline = Math.floor(Date.now() / 1000) + 60; // 1 minute

    const flow_response = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/flow-evm/tokens/${tokenAddress}/pools`,
    );
    const flow_data = await flow_response.json();
    const pair =
      flow_data.data && flow_data.data.length > 0 ? flow_data.data[0] : null;

    const amountOutMin =
      Number(pair.attributes.quote_token_price_base_token) *
      Number(amount) *
      (100 - slippage);

    const tx = await routerContract.swapExactETHForTokens(
      amountOutMin,
      path,
      wallet.address,
      deadline,
    );

    const receipt = await tx.wait();

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
      chainId: 747,
      tokenAddress,
      amount,
      slippage,
      amountOut,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
    const swapRef = this.firestore.collection('swaps').doc();
    const result = await swapRef.set(swap);
    console.log(result);

    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }
}
