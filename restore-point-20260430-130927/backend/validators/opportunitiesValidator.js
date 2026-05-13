const { body, param, query } = require('express-validator')

const createOpportunityValidator = [
  body('title').isString().trim().notEmpty().isLength({ max: 200 }),
  body('currentStageId').isInt({ min: 1 }),
  body('estimatedValue').optional({ nullable: true }).isFloat({ min: 0 }),
  body('probabilityPercent').optional({ nullable: true }).isInt({ min: 0, max: 100 }),
  body('contactEmail').optional({ nullable: true }).isEmail().normalizeEmail(),
  body('expectedCloseDate').optional({ nullable: true }).isISO8601(),
]

const updateOpportunityValidator = [
  param('id').isInt({ min: 1 }),
  ...createOpportunityValidator,
]

const moveStageValidator = [
  param('id').isInt({ min: 1 }),
  body('stageId').isInt({ min: 1 }),
]

const listValidator = [
  query('page').optional().isInt({ min: 1 }),
  query('pageSize').optional().isInt({ min: 10, max: 100 }),
  query('q').optional().isString(),
  query('stageId').optional().isInt({ min: 1 }),
  query('assignedUserId').optional().isInt({ min: 1 }),
]

module.exports = {
  createOpportunityValidator,
  updateOpportunityValidator,
  moveStageValidator,
  listValidator,
}

