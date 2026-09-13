import { asyncHandler } from '../utils/asyncHandler.js'
import { env } from '../config/env.js'

// GET /api/organization/bank-details — shown on the Member payment-submission
// page. Configured via env (not hardcoded) so Admin can update it without a
// deploy; see backend/.env.example for the variable names.
export const getBankDetails = asyncHandler(async (_req, res) => {
    res.json({
        bankName: env.bankName,
        accountTitle: env.bankAccountTitle,
        accountNumber: env.bankAccountNumber,
        iban: env.bankIban,
        branch: env.bankBranch,
        configured: !!(env.bankName && env.bankAccountNumber),
    })
})
