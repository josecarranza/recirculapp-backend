import jwt from 'jsonwebtoken';
import config from '../config';
import Role from '../models/roles.model';
import User from '../models/usuario.model';
export const verifyToken = async (req, res, next) => {

  try {
    const token = req.headers['x-access-token'];
    if (!token) {
      return res.status(400).json({ reLogin: true, message: 'No Token provider' });
    }
    const decoded = jwt.verify(token, config.SECRET);
    req.userId = decoded.id;

    const user = await User.findById(req.userId, { password: 0 });
    if (!user) {
      return res.status(400).json({ reLogin: true, message: 'No user found' });
    }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.log('entro')
      return res.status(401).json({
        ok: false,
        message: 'Token expirado'
      })
    }

    return res.status(400).json({
      ok: false,
      reLogin: true,
      message: 'Token invalido'
    })
  }

}

export const validarJwtToRefresh = async (req, res, next) => {
  const token = req.headers['x-access-token'];
  if (token) {
    try {
      const user = jwt.verify(token, config.SECRET, { ignoreExpiration: true });
      req.userId = user.id;
      next();
    } catch (err) {
      return res.status(400).json(
        {
          ok: false,
          reLogin: true,
          message: 'Token invalido'
        });
    }
  }
  else {
    return res.status(400).json({
      ok: false,
      reLogin: true,
      message: 'Token invalido'
    });
  }

}

export const isAdmin = async (req, res, next) => {
  const user = await User.findById(req.userId);
  const roles = await Role.find({ _id: { $in: user.roles } });
  for (let index = 0; index < roles.length; index++) {
    if (roles[index].name === 'admin' || roles[index].name === 'accountant') {
      next();
      return;
    }
  }
  return res.status(403).json({ message: 'Require admin Role' })
}

export const isCustomer = async (req, res, next) => {
  const user = await User.findById(req.userId);
  const roles = await Role.find({ _id: { $in: user.roles } });
  for (let index = 0; index < roles.length; index++) {
    if (roles[index].name === 'customer') {
      next();
      return;
    }
  }
  return res.status(403).json({ message: 'Require customer Role' })

}

export const isEnterprise = async (req, res, next) => {
  const user = await User.findById(req.userId);
  const roles = await Role.find({ _id: { $in: user.roles } });
  for (let index = 0; index < roles.length; index++) {
    if (roles[index].name === 'enterprise') {
      next();
      return;
    }
  }
  return res.status(403).json({ message: 'Require enterprise Role' })

}

export const isGatherer = async (req, res, next) => {
  const user = await User.findById(req.userId);
  const roles = await Role.find({ _id: { $in: user.roles } });
  for (let index = 0; index < roles.length; index++) {
    if (roles[index].name === 'enterprise') {
      next();
      return;
    }
  }
  return res.status(403).json({ message: 'Require gatherer Role' })

}
