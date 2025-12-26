import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { ApiError } from '@/utils/error';
import { HTTP_STATUS } from '@/constants';

export const validateRequest = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    throw new ApiError(
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      'Validation failed',
      errors.array()
    );
  };
};

export const validate = (validations: ValidationChain[]) => {
  return [
    ...validations,
    (req: Request, res: Response, next: NextFunction) => {
      const errors = validationResult(req);
      if (errors.isEmpty()) {
        return next();
      }
      throw new ApiError(
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        'Validation failed',
        errors.array()
      );
    },
  ];
};
