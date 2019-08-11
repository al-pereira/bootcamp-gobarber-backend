import { startOfDay, endOfDay, parseISO } from 'date-fns';
import { Op } from 'sequelize';
import Appointment from '../models/Appointment';
import User from '../models/User';

class ScheduleController {
    async index(req, res) {
        /**
         * Checa se o usuário logado é um prestador de serviços
         */
        const checkUserProvider = await User.findOne({
            where: { id: req.userId, provider: true },
        });

        if (!checkUserProvider) {
            return res
                .status(401)
                .json({ mensagem: 'Seu usuário não é prestador de serviços' });
        }

        const { date } = req.query;
        const parsedDate = parseISO(date);

        /**
         * Se passou nas validações
         */
        const lstAppointments = await Appointment.findAll({
            where: {
                provider_id: req.userId,
                canceled_at: null,
                date: {
                    [Op.between]: [
                        startOfDay(parsedDate),
                        endOfDay(parsedDate),
                    ],
                },
            },
            order: ['date'],
        });

        return res.json(lstAppointments);
    }
}

export default new ScheduleController();
