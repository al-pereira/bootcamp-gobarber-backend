import jwt from 'jsonwebtoken';
import User from '../models/User';
import authConfig from '../../config/auth';

class SessionController {
    async store(req, res) {
        const { email, password } = req.body;

        /**
         * Verifica se o usuário existe com o e-mail informado
         */
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res
                .status(400)
                .json({ mensagem: 'Usuário não encontrado com este e-mail' });
        }

        /**
         * Verifica se a senha está correta
         */

        if (!(await user.checkPassword(password))) {
            return res.status(401).json({ mensagem: 'Senha incorreta' });
        }

        /**
         * Se der tudo certo
         */
        const { id, name } = user;

        return res.json({
            user: {
                id,
                name,
                email,
            },
            token: jwt.sign({ id }, authConfig.secret, {
                expiresIn: authConfig.expiresIn,
            }),
        });
    }
}

export default new SessionController();
