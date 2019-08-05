import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import authConfig from '../../config/auth';

export default async (req, res, next) => {
    const authHeader = req.headers.authorization;
    /**
     * Se não existir o token na requisição
     */
    if (!authHeader) {
        return res.status(401).json({ mensagem: 'Token não enviado' });
    }

    /*
     * Se o token foi enviado na requisição
     */
    const [, token] = authHeader.split(' ');

    try {
        const decoded = await promisify(jwt.verify)(token, authConfig.secret);

        // Cria um campo na requisição que recebe o ID do usuário logado
        req.userId = decoded.id;

        return next();
    } catch (err) {
        return res.status(401).json({ mensagem: 'Token inválido' });
    }
};
