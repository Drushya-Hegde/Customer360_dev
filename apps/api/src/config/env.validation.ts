import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(4100),
  DATABASE_URL: Joi.string().optional(),
  MONGODB_URL: Joi.string().optional(),
  KEYCLOAK_ISSUER: Joi.string().uri().optional(),
  OLLAMA_URL: Joi.string().uri().optional(),
  FRONTEND_ORIGIN: Joi.string().uri().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: Joi.string().uri().optional(),
}).required();
