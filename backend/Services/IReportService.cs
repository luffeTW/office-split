using backend.Models;

namespace backend.Services;

public interface IReportService
{
    Task<ReportDto> GetGroupReportAsync(int groupId, int userId, DateTime? startDate = null, DateTime? endDate = null, int? categoryId = null);
    Task<byte[]> ExportReportToCsvAsync(int groupId, int userId, DateTime? startDate = null, DateTime? endDate = null, int? categoryId = null);
    Task<byte[]> ExportReportToExcelAsync(int groupId, int userId, DateTime? startDate = null, DateTime? endDate = null, int? categoryId = null);
    Task<MyDebtsDto> GetMyDebtsAsync(int groupId, int userId, DateTime? startDate = null, DateTime? endDate = null, int? categoryId = null);
}
