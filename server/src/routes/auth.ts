import { Router } from 'express';
import { requireAuth, signToken, verifyPassword } from '../auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || typeof password !== 'string') {
      res.status(400).json({ error: '请输入密码' });
      return;
    }

    const user = await verifyPassword(password);
    if (!user) {
      res.status(401).json({ error: '密码错误' });
      return;
    }

    const token = signToken(user);
    res.json({ token, username: user.username });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : '登录失败' });
  }
});

router.get('/status', requireAuth, (req, res) => {
  res.json({ username: req.user!.username });
});

export default router;
