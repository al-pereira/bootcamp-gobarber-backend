import Sequelize from 'sequelize';
import User from '../app/models/User';
import databaseConfig from '../config/database';

const lstModels = [User];

class Database {
    constructor() {
        this.init();
    }

    init() {
        this.connection = new Sequelize(databaseConfig);

        lstModels.map(model => model.init(this.connection));
    }
}

export default new Database();
