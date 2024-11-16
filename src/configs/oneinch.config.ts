import { registerAs } from '@nestjs/config';

export default registerAs('1inch', () => ({
  apiKey: process.env.ONEINCH_API_KEY,
}));
