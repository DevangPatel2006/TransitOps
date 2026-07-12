const { z } = require('zod');

const dateCoercion = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: 'Invalid date format (must be YYYY-MM-DD)',
}).transform((val) => new Date(val));

const uploadDocumentSchema = z.object({
  body: z.object({
    doc_type: z.enum(['INSURANCE', 'RC', 'PERMIT', 'PUC', 'OTHER']),
    issue_date: dateCoercion,
    expiry_date: dateCoercion,
  }),
});

const queryExpiringDocsSchema = z.object({
  query: z.object({
    days: z.string().regex(/^\d+$/).transform(Number).default('30'),
  }),
});

const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be an integer').transform(Number),
  }),
});

const docIdParamSchema = z.object({
  params: z.object({
    docId: z.string().regex(/^\d+$/, 'Document ID must be an integer').transform(Number),
  }),
});

module.exports = {
  uploadDocumentSchema,
  queryExpiringDocsSchema,
  idParamSchema,
  docIdParamSchema,
};
