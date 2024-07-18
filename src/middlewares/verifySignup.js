import { ROLES } from '../models/roles.model';
import User from '../models/usuario.model';
export const checkRolesExisted = (req, res, next) => {
    if (req.body.roles) {
        for (let index = 0; index < req.body.roles.length; index++) {
            if (!ROLES.includes(req.body.roles[index])) {
                return res.status(400).json({ message: `Role ${req.body.roles[index]} does not exist` });
            }
        }
    }
    next();
}

export const checkDuplicatedUsername = async (req, res, next) => {
    console.log(req.body);
    const user = await User.findOne({ username: req.body.username });
    if (user) {
        return res.status(400).json({ message: 'The User already exists' });
    }
    const email = await User.findOne({ email: req.body.email });
    if (email) {
        return res.status(400).json({ message: 'The Email already exists' });
    }
    next();

}

