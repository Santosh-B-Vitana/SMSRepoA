// Export API client
export { default as apiClient } from './apiClient';

// Export Examination API
export type {
  ExamBasic,
  ExamFull,
  CreateExamDto,
  UpdateExamDto,
  ExamFilters,
  ResultBasic,
  ResultFull,
  CreateResultDto,
  BulkResultDto,
  ReportCard,
  GenerateReportCardDto,
  ExamStats,
  GradeDto,
  PaginatedResponse,
  ResultFilters,
  BulkOperationResult
} from './examinationApi';
export { default as examinationApi } from './examinationApi';

// Export Fee API
export type {
  FeeStructure,
  FeeStructureBasic,
  FeeRecord,
  CreateFeeRecordDto,
  CreateFeeStructureDto,
  PaymentTransaction,
  CreatePaymentDto,
  LateFeeConfig,
  CreateLateFeeConfigDto,
  PaymentGatewayResponse,
  InitiatePaymentDto,
  VerifyPaymentDto,
  RefundResponse,
  CreateRefundDto,
  ReminderResult,
  SendRemindersDto,
  FeeStats
} from './feeApi';
export { default as feeApi } from './feeApi';

// Export Holiday API
export type { 
  HolidayBasic, 
  HolidayFull, 
  CreateHolidayDto, 
  UpdateHolidayDto,
  HolidayFilters
} from './holidayApi';
export { default as holidayApi } from './holidayApi';

// Export Board API
export type {
  GradeScaleEntry,
  ExamStructureEntry,
  BoardConfigurationResponse,
  BoardListResponse,
  SchoolBoardConfigResponse,
  SetSchoolBoardConfigRequest,
  BoardAwareGradeResult
} from './boardApi';
export { default as boardApi } from './boardApi';
