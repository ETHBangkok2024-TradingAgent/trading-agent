import { Command } from 'nestjs-telegraf';

export const Positions = (): MethodDecorator => Command('positions');
