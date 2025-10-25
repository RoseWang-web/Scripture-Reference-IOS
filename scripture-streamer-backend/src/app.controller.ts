import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
  
  @Post('test')
  testEndpoint(@Body() data: any) {
    console.log('🔥 Test endpoint received:', data);
    return { message: 'Test received', data };
  }
  
  @Get('health')
  healthCheck() {
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      message: 'Scripture Streamer Backend is running'
    };
  }
}
