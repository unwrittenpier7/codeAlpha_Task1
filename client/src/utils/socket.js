// client/src/utils/socket.js

import { io } from 'socket.io-client';

const socket = io(process.env.REACT_APP_SOCKET_SERVER_URL || 'http://localhost:5000');

export default socket;
