import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.module';
import { OneInchService } from 'src/modules/1inch/oneinch.service';
import { PortfolioService } from 'src/modules/1inch/portfolio.service';
import { RpcService } from 'src/modules/1inch/rpc.service';
import { TokenService } from 'src/modules/1inch/token.service';

const main = async (): Promise<void> => {
  const app = await NestFactory.createApplicationContext(AppModule);
  // const tokenService = app.get(TokenService);
  // const price = await tokenService.getPrice(
  //   ['0xB1a03EdA10342529bBF8EB700a06C60441fEf25d'],
  //   8453,
  // );
  // console.log(price);
  const rpcService = app.get(RpcService);
  const eth = await rpcService.getEtherBalance(
    '0x8CDaD017a161222fE6b9c7295F75034d0FF10763',
    8453,
  );
  console.log(eth);
};

main()
  .then(() => process.exit(0))
  .catch(console.error);
