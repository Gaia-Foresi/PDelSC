const router = require('express').Router();
const ctl = require('../controllers/auth');
const validar = require('../middlewares/validate');
const asyncHandler = require('../utils/asyncHandler');
const { z, texto, email, password, codigo } = require('../utils/esquemas');

const S = {
  registro: z.object({ nombre: texto(60), apellido: texto(60), email, password }),
  verificarEmail: z.object({ email, codigo }),
  login: z.object({ email, password: z.string({ required_error: 'Obligatorio' }).min(1, 'Obligatorio').max(72) }),
  login2fa: z.object({ email, codigo }),
  reenviar: z.object({ email, proposito: z.enum(['verificar_email', 'login_2fa', 'reset_password'], { message: 'Propósito inválido' }) }),
  social: z.object({
    proveedor: z.enum(['google', 'github', 'discord'], { message: 'Proveedor inválido' }),
    // ingreso = solo entra si ya existe la cuenta · registro = la crea si no existe
    modo: z.enum(['ingreso', 'registro']).optional(),
    token: z.string().max(4000).optional(),
    code: z.string().max(500).optional(),
    redirect_uri: z.string().max(500).optional(),
    code_verifier: z.string().max(200).optional(),
  }),
  refresh: z.object({ refresh_token: texto(200) }),
  olvide: z.object({ email }),
  reset: z.object({ email, codigo, password }),
};

router.post('/registro', validar(S.registro), asyncHandler(ctl.registro));
router.post('/verificar-email', validar(S.verificarEmail), asyncHandler(ctl.verificarEmail));
router.post('/login', validar(S.login), asyncHandler(ctl.login));
router.post('/login-2fa', validar(S.login2fa), asyncHandler(ctl.login2fa));
router.post('/reenviar-codigo', validar(S.reenviar), asyncHandler(ctl.reenviarCodigo));
router.post('/social', validar(S.social), asyncHandler(ctl.social));
router.post('/refresh', validar(S.refresh), asyncHandler(ctl.refresh));
router.post('/logout', validar(S.refresh), asyncHandler(ctl.logout));
router.post('/olvide-password', validar(S.olvide), asyncHandler(ctl.olvidePassword));
router.post('/reset-password', validar(S.reset), asyncHandler(ctl.resetPassword));

module.exports = router;
