# Legal Document Summarizer Backend

A REST API backend for the Legal Document Summarizer application. Built with Node.js, TypeScript, Express.js, PostgreSQL (Supabase), and Prisma ORM.

## Features

- Document upload (PDF and plain text)
- Text extraction from PDFs
- Clause segmentation and classification via pluggable engine
- Risk assessment and sentiment analysis
- Report generation with summaries, top risks, obligations, and exit conditions
- Admin interface for classification rules management
- Document status tracking (UPLOADED, PROCESSING, COMPLETED, FAILED)

## Tech Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.x
- **Framework**: Express.js 5.x
- **Database**: PostgreSQL (hosted on Supabase)
- **ORM**: Prisma 7.x
- **Validation**: Zod 3.x
- **File Upload**: Multer
- **PDF Parsing**: pdf-parse
- **Testing**: Vitest + Supertest

## Prerequisites

- Node.js 20 or higher
- npm 10 or higher
- PostgreSQL database (Supabase recommended)
- Git

## Installation

```bash
cd backend
npm install
```

## Environment Setup

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Supabase pooled connection string (port 6543) | `postgresql://user:pass@host:6543/db?pgbouncer=true` |
| `DIRECT_URL` | Supabase direct connection string (port 5432) for migrations | `postgresql://user:pass@host:5432/db` |
| `PORT` | Server port | `8000` |
| `NODE_ENV` | Environment mode | `development` |
| `FRONTEND_URL` | Frontend origin for CORS | `http://localhost:5173` |
| `UPLOAD_DIR` | Local upload directory | `uploads` |
| `MAX_FILE_SIZE_MB` | Maximum upload size in MB | `10` |

### Supabase Setup

1. Create a new Supabase project
2. Go to Settings → Database → Connection pooling
3. Copy the **Pooled connection string** (port 6543) → `DATABASE_URL`
4. Copy the **Direct connection string** (port 5432) → `DIRECT_URL`
5. Enable the `uuid-ossp` extension in Supabase SQL editor: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`

## Database Migration

Generate Prisma client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

Open Prisma Studio to inspect data:

```bash
npm run prisma:studio
```

## Development

Start the development server with hot reload:

```bash
npm run dev
```

Server runs at `http://localhost:8000` by default.

## Production Build

```bash
npm run build
npm start
```

## Testing

Run all tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:coverage
```

## API Endpoints

### Health

- `GET /api/health` - Health check with database connectivity

### Documents

- `POST /api/documents` - Upload a document (multipart/form-data, field: `file`)
- `GET /api/documents` - List documents (query: `page`, `limit`, `status`)
- `GET /api/documents/:id` - Get document metadata
- `GET /api/documents/:id/clauses` - Get extracted clauses
- `GET /api/documents/:id/report` - Get generated report
- `POST /api/documents/:id/process` - Trigger document processing
- `DELETE /api/documents/:id` - Delete document and file

### Reports

- `GET /api/reports/:id` - Get report by ID

### Rules (Admin)

- `POST /api/rules` - Create classification rule
- `GET /api/rules` - List rules (query: `page`, `limit`, `category`, `isActive`)
- `GET /api/rules/:id` - Get rule by ID
- `PATCH /api/rules/:id` - Update rule
- `DELETE /api/rules/:id` - Delete rule

## Example Requests

### Upload Document

```bash
curl -X POST http://localhost:8000/api/documents \
  -F "file=@contract.pdf"
```

Response:
```json
{
  "id": "uuid",
  "fileName": "contract.pdf",
  "status": "UPLOADED",
  "message": "Document uploaded successfully. Use POST /api/documents/:id/process to start processing."
}
```

### Process Document

```bash
curl -X POST http://localhost:8000/api/documents/:id/process
```

Response:
```json
{
  "message": "Document processed successfully",
  "document": {
    "id": "uuid",
    "fileName": "contract.pdf",
    "status": "COMPLETED",
    "clauses": [...],
    "report": {...}
  }
}
```

### Get Report

```bash
curl http://localhost:8000/api/documents/:id/report
```

Response:
```json
{
  "id": "uuid",
  "documentId": "uuid",
  "summary": "Document contains 5 clauses: 2 obligation(s), 1 termination(s), 2 payment_term(s).",
  "topRisks": ["Clause text indicating high risk..."],
  "obligations": ["Party shall deliver...", "Vendor must provide..."],
  "exitConditions": ["Either party may terminate..."],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

## Document Processing Workflow

1. **Upload**: Client sends PDF/text file via `POST /api/documents`
2. **Validate**: Server validates file type, size, and stores file locally
3. **Record**: Document record created with `UPLOADED` status
4. **Extract**: Client calls `POST /api/documents/:id/process`
5. **Parse**: Text extracted from PDF using `pdf-parse` or read as plain text
6. **Classify**: Text passed to `ClauseProcessingEngine` (pluggable adapter)
7. **Persist**: Clauses and report saved in database transaction
8. **Complete**: Document status updated to `COMPLETED`
9. **Error Handling**: On failure, status set to `FAILED`, file preserved for debugging

## Classification Engine Integration

The backend uses a pluggable `ClauseProcessingEngine` interface:

```typescript
interface ClauseProcessingEngine {
  processDocument(text: string): Promise<ProcessingResult>;
}

type ProcessingResult = {
  clauses: ProcessedClause[];
  summary: string;
  topRisks: string[];
  obligations: string[];
  exitConditions: string[];
};

type ProcessedClause = {
  text: string;
  category: ClauseCategory;
  sentiment: ClauseSentiment;
  riskLevel: RiskLevel;
  explanation: string;
};
```

### For the Classification Engine Team (Varun)

**To integrate your engine:**

1. Implement the `ClauseProcessingEngine` interface in your module
2. Export a class/function that matches the interface
3. In `src/services/clauseEngine.ts`, replace the mock:
   ```typescript
   import { YourEngine } from "your-engine-package";
   setClauseEngine(new YourEngine());
   ```
4. Ensure your implementation:
   - Segments text into clauses
   - Classifies each clause into: OBLIGATION, RIGHT, PENALTY, TERMINATION, PAYMENT_TERM, OTHER
   - Assigns sentiment: FAVORABLE, UNFAVORABLE, NEUTRAL
   - Assigns risk level: LOW, MEDIUM, HIGH
   - Provides explanation for each classification
   - Generates summary, top 5 risks, obligations list, exit conditions

**Current mock implementation** (`src/services/clauseEngine.ts:MockClauseEngine`) uses simple keyword matching for development. Replace it with your rule-based/ML implementation.

## Security

- File type validation (MIME type + extension)
- File size limits (configurable, default 10MB)
- Safe filename generation (timestamp + random suffix)
- Parameterized queries via Prisma (SQL injection prevention)
- Input validation via Zod schemas
- CORS restricted to configured frontend origin
- No secrets in repository (use `.env`)
- Centralized error handling (no stack traces exposed)

## Project Structure

```
backend/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── config/
│   │   └── env.ts             # Environment validation
│   ├── controllers/
│   │   ├── documentController.ts
│   │   └── ruleController.ts
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client singleton
│   │   └── fileExtractor.ts   # PDF/text extraction
│   ├── middleware/
│   │   ├── errorHandler.ts    # Centralized error handling
│   │   ├── upload.ts          # Multer configuration
│   │   └── validation.ts      # Zod validation middleware
│   ├── routes/
│   │   ├── health.ts
│   │   ├── documents.ts
│   │   ├── rules.ts
│   │   └── reports.ts
│   ├── services/
│   │   ├── documentService.ts # Document business logic
│   │   ├── ruleService.ts     # Rule CRUD operations
│   │   └── clauseEngine.ts    # Processing engine adapter
│   ├── types/
│   │   └── index.ts           # Shared TypeScript types
│   ├── validators/
│   │   └── document.ts        # Zod schemas
│   ├── app.ts                 # Express app setup
│   └── server.ts              # Entry point
├── tests/
│   ├── setup.ts
│   ├── health.test.ts
│   ├── documents.test.ts
│   ├── rules.test.ts
│   └── processing.test.ts
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

## Known Limitations

1. **No authentication** - All endpoints are public. Add auth middleware if needed.
2. **Local file storage** - Files stored on local filesystem. For production, integrate S3-compatible storage.
3. **Synchronous processing** - Document processing blocks the request. For large files, consider background job queue (BullMQ, etc.).
4. **Mock classification engine** - Current implementation uses keyword matching. Replace with real engine.
5. **No rate limiting** - Add express-rate-limit for production.
6. **Single-instance file storage** - Not suitable for horizontal scaling without shared storage.

## Remaining Integration Tasks

1. **Varun (Classification Engine)**: Implement `ClauseProcessingEngine` interface and replace mock in `clauseEngine.ts`
2. **Harnoor (Frontend)**: Connect to API endpoints, handle file upload UX, display processing status polling
3. **Authentication**: Decide on auth strategy (Supabase Auth, JWT, etc.) and implement
4. **Production storage**: Configure S3/Supabase Storage for file uploads
5. **Background processing**: Add job queue if processing time exceeds HTTP timeout

## License

ISC