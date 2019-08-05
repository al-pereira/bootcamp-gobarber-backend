import * as Yup from 'yup';
import User from '../models/User';

class UserController {
    async store(req, res) {
        /**
         * Validação dos campos
         */
        const schema = Yup.object().shape({
            name: Yup.string().required(),
            email: Yup.string()
                .email()
                .required(),
            password: Yup.string()
                .required()
                .min(6),
        });

        if (!(await schema.isValid(req.body))) {
            return res
                .status(400)
                .json({ mensagem: 'Erro na validação dos campos' });
        }

        /**
         * Verifica se o e-mail já está cadastrado
         */
        const userExists = await User.findOne({
            where: { email: req.body.email },
        });

        if (userExists) {
            return res
                .status(400)
                .json({ mensagem: 'Já existe um usuário com este e-mail.' });
        }

        /**
         * Se passou nas verificações faz a inclusão do usuário no banco
         */
        const { id, name, provider } = await User.create(req.body);

        return res.json({ id, name, provider });
    }

    async update(req, res) {
        /**
         * Validação dos campos
         */
        const schema = Yup.object().shape({
            name: Yup.string(),
            email: Yup.string().email(),
            oldPassword: Yup.string().min(6),
            password: Yup.string()
                .min(6)
                .when('oldPassword', (oldPassword, field) =>
                    oldPassword ? field.required() : field
                ),
            confirmPassword: Yup.string().when('password', (password, field) =>
                password ? field.required().oneOf([Yup.ref('password')]) : field
            ),
        });

        if (!(await schema.isValid(req.body))) {
            return res
                .status(400)
                .json({ mensagem: 'Erro na validação dos campos' });
        }

        /**
         * Verifica se o e-mail para o qual estiver alterando já existe
         */
        const { email, oldPassword } = req.body;

        const user = await User.findByPk(req.userId);

        if (email !== user.email) {
            const userExists = await User.findOne({
                where: { email },
            });

            if (userExists) {
                return res.status(400).json({
                    mensagem: 'Já existe um usuário com este e-mail.',
                });
            }
        }

        /**
         * Verifica se a senha antiga está correta
         */
        if (oldPassword && !(await user.checkPassword(oldPassword))) {
            return res.status(401).json({ mensagem: 'Senha antiga incorreta' });
        }

        /**
         * Se passou pelas verificações
         */

        const { id, name, provider } = await user.update(req.body);

        return res.json({
            id,
            name,
            email,
            provider,
        });
    }
}

export default new UserController();
