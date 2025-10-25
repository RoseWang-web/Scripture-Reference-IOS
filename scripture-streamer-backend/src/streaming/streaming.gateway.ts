import { Injectable } from "@nestjs/common";
import { WebSocket } from 'ws';

@Injectable()
export class StreamingGateway {
    private ws: WebSocket;

    constructor() {
    }
}