import { ZodSchema } from "zod";
import { Request, Response, NextFunction, RequestHandler } from "express";
import { ErrorFactory } from "./appError";
import { logger } from "./logger";

/**
 * Enhanced validation middleware that uses Zod schemas
 * Formats errors in a consistent way and integrates with the global error handler
 * @param schema The Zod schema to validate against
 * @returns Express middleware function
 */
const validate = (schema: ZodSchema): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse({
            body: req.body,
            query: req.query,
            params: req.params
        });

        if (!result.success) {
            // Format validation errors
            const formattedErrors = result.error.flatten().fieldErrors;

            // Log validation errors
            logger.warn(`Validation failed`, {
                path: req.path,
                method: req.method,
                errors: formattedErrors,
                ip: req.ip,
                userId: (req as any).user?.user_id || 'unauthenticated'
            });

            // Pass to error handler with 422 status (Unprocessable Entity)
            next(ErrorFactory.validation("Validation failed", formattedErrors));
            return;
        }

        // Extract validated data
        const { body, query, params } = result.data;

        // Update request objects with validated data
        if (body) req.body = body;
        if (query) req.query = query as any;
        if (params) req.params = params as any;

        next();
    };
};

export default validate;
export { validate };