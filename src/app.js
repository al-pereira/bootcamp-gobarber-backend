import 'dotenv/config';
import express from 'express';
import * as Sentry from '@sentry/node';
import Youch from 'youch';
import path from 'path';
import sentryConfig from './config/sentry';
import 'express-async-errors';
import routes from './routes';
import './database';

class App {
    constructor() {
        this.server = express();
        Sentry.init(sentryConfig);
        this.middlewares();
        this.routes();
        this.exceptionHandler();
    }

    middlewares() {
        this.server.use(Sentry.Handlers.requestHandler());
        this.server.use(express.json());
        this.server.use(
            '/files',
            express.static(path.resolve(__dirname, '..', 'tmp', 'uploads'))
        );
    }

    routes() {
        this.server.use(routes);
        this.server.use(Sentry.Handlers.errorHandler());
    }

    exceptionHandler() {
        this.server.use(async (err, req, res, next) => {
            // Se estiver em ambiente de desenvolvimento
            if (process.env.NODE_ENV === 'development') {
                const errors = await new Youch(err, req).toJSON();

                return res.status(500).json(errors);
            }

            // Se não estiver em ambiente de desenvolvimento
            return res
                .status(500)
                .json({ mensagem: 'Erro interno no servidor' });
        });
    }
}

export default new App().server;
