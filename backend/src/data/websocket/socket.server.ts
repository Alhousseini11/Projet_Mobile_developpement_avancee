import { Server } from 'socket.io';
import http from 'http';

export const createSocketServer = (server: http.Server) => new Server(server, { cors: { origin: '*' } });
