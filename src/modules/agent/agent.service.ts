import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class AgentService {
  private apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('OPENROUTER_API_KEY');
  }

  async getAgentThoughts(prompt: string) {
    const response = await lastValueFrom(
      this.httpService.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          messages: [
            {
              role: 'system',
              content: `You are an expert in memecoin trading, you will be given a data of a memecoin token
            Please give me your analytical thoughts on the token. Make it less than 3 sentences. Answer in a mood of a crypto degen bro but still insightful.
            `,
            },
            { role: 'user', content: prompt },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      ),
    );
    return response.data.choices[0].message.content;
  }
}
