import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

export const registroSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

export const campeonatoSchema = z.object({
  nombre: z.string().min(3, 'Mínimo 3 caracteres'),
  anio: z.number().int().min(2000).max(2100),
  claseId: z.string().min(1, 'Seleccionar una clase'),
  sedeId: z.string().optional(),
  fechaInicio: z.string().optional(),
  fechaFin: z.string().optional(),
  fuenteUrl: z.string().url().optional().or(z.literal('')),
  descartes: z.number().int().min(0).default(0),
});

export const regataSchema = z.object({
  numero: z.number().int().min(1),
  fecha: z.string().optional(),
  condiciones: z.string().optional(),
});

export const resultadoSchema = z.object({
  regatistaId: z.string().min(1),
  puesto: z.number().int().min(1),
  puntos: z.number().min(0),
  observacion: z.string().optional(),
});

export const regatistaSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  clubId: z.string().optional(),
  pais: z.string().optional(),
});

export const resultadosBulkSchema = z.object({
  regataNumero: z.number().int().min(1),
  fecha: z.string().optional(),
  condiciones: z.string().optional(),
  resultados: z.array(resultadoSchema).min(1, 'Al menos un resultado'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegistroInput = z.infer<typeof registroSchema>;
export type CampeonatoInput = z.infer<typeof campeonatoSchema>;
export type RegataInput = z.infer<typeof regataSchema>;
export type ResultadoInput = z.infer<typeof resultadoSchema>;
export type RegatistaInput = z.infer<typeof regatistaSchema>;
export type ResultadosBulkInput = z.infer<typeof resultadosBulkSchema>;
