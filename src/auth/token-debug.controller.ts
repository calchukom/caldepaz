import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../middleware/logger";
import { ResponseUtil } from "../middleware/response";

/**
 * Debug endpoint to help diagnose token issues
 * POST /api/auth/debug-token
 * @access Public (for debugging only)
 */
export const debugToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { token } = req.body;

        if (!token) {
            return ResponseUtil.error(res, 400, "No token provided", "DEBUG_NO_TOKEN");
        }

        const analysis = {
            provided: true,
            length: token.length,
            startsWithBearer: token.startsWith('Bearer '),
            structure: {
                parts: token.split('.').length,
                hasThreeParts: token.split('.').length === 3,
                header: null as any,
                payload: null as any,
                signature: !!token.split('.')[2]
            },
            validation: {
                isValidFormat: false,
                decodedHeader: null as any,
                decodedPayload: null as any,
                error: null as string | null
            }
        };

        // Clean token (remove Bearer prefix if present)
        const cleanToken = token.replace('Bearer ', '');
        analysis.structure.parts = cleanToken.split('.').length;

        try {
            // Try to decode header and payload (without verification)
            const parts = cleanToken.split('.');
            if (parts.length === 3) {
                try {
                    analysis.structure.header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
                    analysis.structure.payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                    analysis.validation.decodedHeader = analysis.structure.header;
                    analysis.validation.decodedPayload = analysis.structure.payload;
                    analysis.validation.isValidFormat = true;
                } catch (decodeError) {
                    analysis.validation.error = "Cannot decode JWT parts";
                }

                // Try to verify the token
                try {
                    const verified = jwt.verify(cleanToken, process.env.REFRESH_TOKEN_SECRET!);
                    analysis.validation.error = null;
                } catch (verifyError) {
                    analysis.validation.error = verifyError instanceof Error ? verifyError.message : 'Verification failed';
                }
            } else {
                analysis.validation.error = `Invalid JWT format: expected 3 parts, got ${parts.length}`;
            }
        } catch (error) {
            analysis.validation.error = error instanceof Error ? error.message : 'Unknown error';
        }

        // Log the debug attempt (without sensitive data)
        logger.info("Token debug requested", {
            tokenLength: token.length,
            isValidFormat: analysis.validation.isValidFormat,
            error: analysis.validation.error,
            ip: req.ip
        });

        ResponseUtil.success(res, analysis, "Token analysis complete");

    } catch (error: any) {
        logger.error("Token debug error", {
            error: error.message
        });
        next(error);
    }
};
