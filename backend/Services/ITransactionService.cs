using backend.Models;

namespace backend.Services;

public interface ITransactionService
{
    Task<List<TransactionDto>> GetTransactionsAsync(int groupId, int userId, DateTime? startDate = null, DateTime? endDate = null, int? categoryId = null);
    Task<TransactionDto?> GetTransactionByIdAsync(int id, int userId);
    Task<TransactionDto> CreateTransactionAsync(CreateTransactionDto createDto, int userId);
    Task<TransactionDto?> UpdateTransactionAsync(int id, UpdateTransactionDto updateDto, int userId);
    Task<bool> DeleteTransactionAsync(int id, int userId);
    Task<List<SplitDto>> GetTransactionSplitsAsync(int transactionId, int userId);
    Task<SplitDto?> UpdateSplitAsync(int splitId, UpdateSplitDto updateDto, int userId);
    Task<int> SettlePairDebtsAsync(int groupId, int userId, int otherUserId, string direction, DateTime? upToDate = null);
    Task<TransactionDto?> UploadReceiptAsync(int transactionId, int userId, string receiptUrl);
}
