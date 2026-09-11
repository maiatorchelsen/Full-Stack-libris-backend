import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface TokenPayload {
  clienteLogadoId?: string;
  clienteLogadoNome?: string;
  adminLogadoId?: string;
  adminLogadoNome?: string;
}

declare global {
  namespace Express {
    interface Request {
      clienteLogadoId?: string;
      clienteLogadoNome?: string;
      adminLogadoId?: string;
      adminLogadoNome?: string;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ erro: "Token não fornecido" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY as string) as TokenPayload;
    req.clienteLogadoId = decoded.clienteLogadoId;
    req.clienteLogadoNome = decoded.clienteLogadoNome;
    req.adminLogadoId = decoded.adminLogadoId;
    req.adminLogadoNome = decoded.adminLogadoNome;
    next();
  } catch (error) {
    res.status(401).json({ erro: "Token inválido ou expirado" });
  }
}

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ erro: "Token não fornecido" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY as string) as TokenPayload;
    
    if (!decoded.adminLogadoId) {
      res.status(403).json({ erro: "Acesso negado. Apenas administradores." });
      return;
    }

    req.adminLogadoId = decoded.adminLogadoId;
    req.adminLogadoNome = decoded.adminLogadoNome;
    next();
  } catch (error) {
    res.status(401).json({ erro: "Token inválido ou expirado" });
  }
}
