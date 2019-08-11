import Notification from '../schemas/Notification';
import User from '../models/User';

class NotificationController {
    async index(req, res) {
        /**
         * Checa se o provider_id é um prestador de serviços
         */
        const isProvider = await User.findOne({
            where: { id: req.userId, provider: true },
        });

        if (!isProvider) {
            return res.status(401).json({
                mensagem:
                    'Somente prestadores de serviço podem ver notificações',
            });
        }

        /**
         * Se passou nas verificações
         */
        const notifications = await Notification.find({ user: req.userId })
            .sort({ createdAt: 'desc' })
            .limit(20);

        return res.json(notifications);
    }

    async update(req, res) {
        // const notification = await Notification.findById()
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { read: true },
            { new: true }
        );

        return res.json(notification);
    }
}

export default new NotificationController();
