import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore, format, subHours } from 'date-fns';
import pt from 'date-fns/locale/pt';
import Appointment from '../models/Appointment';
import File from '../models/File';
import User from '../models/User';
import Notification from '../schemas/Notification';
import Queue from '../../lib/Queue';
import CancellationMail from '../jobs/CancellationMail';

class AppointmentController {
    async index(req, res) {
        const { page = 1 } = req.query;

        const lstAppointments = await Appointment.findAll({
            where: { user_id: req.userId, canceled_at: null },
            attributes: ['id', 'date', 'past', 'cancelable'],
            limit: 20,
            offset: (page - 1) * 20,
            order: ['date'],
            include: [
                {
                    model: User,
                    as: 'provider',
                    attributes: ['id', 'name'],
                    include: [
                        {
                            model: File,
                            as: 'avatar',
                            attributes: ['id', 'path', 'url'],
                        },
                    ],
                },
            ],
        });

        return res.json(lstAppointments);
    }

    async store(req, res) {
        /**
         * Validação dos campos
         */
        const schema = Yup.object().shape({
            provider_id: Yup.number().required(),
            date: Yup.date().required(),
        });

        if (!(await schema.isValid(req.body))) {
            return res
                .status(400)
                .json({ mensagem: 'Erro na validação dos campos' });
        }

        const { provider_id, date } = req.body;

        /**
         * Checa se o provider_id é um prestador de serviços
         */
        const isProvider = await User.findOne({
            where: { id: provider_id, provider: true },
        });

        if (!isProvider) {
            return res.status(401).json({
                mensagem:
                    'Você pode criar agendamentos somente com prestadores de serviço',
            });
        }

        /**
         * Checa se o usuário logado está tentando marcar um serviço com ele mesmo
         */
        if (provider_id === req.userId) {
            return res.status(400).json({
                mensagem:
                    'Usuário não pode marcar um agendamento com ele mesmo',
            });
        }

        /**
         * Checa se a data informada na requisição já passou
         */

        // Pega somente o dia e a hora (sem minutos e segundos)
        const hourStart = startOfHour(parseISO(date));

        // Se a hora informada já passou
        if (isBefore(hourStart, new Date())) {
            return res
                .status(400)
                .json({ mensagem: 'Não é permitido datas passadas' });
        }

        /**
         * Checa se a data e horário estão disponíveis
         */
        const checkAvailability = await Appointment.findOne({
            where: {
                provider_id,
                canceled_at: null,
                date: hourStart,
            },
        });

        if (checkAvailability) {
            return res
                .status(400)
                .json({ mensagem: 'Data/horário não está disponível' });
        }

        /**
         * Se passou pelas verificações, cria o agendamento
         */
        const appoitment = await Appointment.create({
            user_id: req.userId,
            provider_id,
            date,
        });

        /**
         * Notifica o prestador de serviços que há um novo agendamento
         */
        const user = await User.findByPk(req.userId);

        const formattedDate = format(hourStart, "dd 'de' MMMM', às 'H:mm'hs'", {
            locale: pt,
        });

        await Notification.create({
            content: `Novo agendamento de ${user.name} para o dia ${formattedDate}`,
            user: provider_id,
        });

        return res.json(appoitment);
    }

    async delete(req, res) {
        const appointment = await Appointment.findByPk(req.params.id, {
            include: [
                {
                    model: User,
                    as: 'provider',
                    attributes: ['name', 'email'],
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['name'],
                },
            ],
        });
        /**
         * Checa se o usuário logado é dono do agendamento
         */
        if (appointment.user_id !== req.userId) {
            return res.status(401).json({
                mensagem:
                    'Você não tem permissão para cancelar este agendamento',
            });
        }

        /**
         * Checa se a hora atual é pelo menos duas horas antes da hora agendada
         */
        const dateWithSub = subHours(appointment.date, 2);

        if (isBefore(dateWithSub, new Date())) {
            return res.status(401).json({
                mensagem:
                    'Você pode cancelar agendamentos somente com 2 horas de antecedência.',
            });
        }

        /**
         * Se passou pelas checagens, define o agendamento como cancelado infomando a data
         * do cancelamento
         */
        appointment.canceled_at = new Date();
        await appointment.save();

        /**
         * Chama o job que envia um e-mail para o prestador de serviço notificando o
         * cancelamento
         */
        await Queue.add(CancellationMail.key, {
            appointment,
        });

        return res.json(appointment);
    }
}

export default new AppointmentController();
