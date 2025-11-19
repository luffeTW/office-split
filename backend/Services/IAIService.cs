using backend.Models.Dtos;

namespace backend.Services;

public interface IAIService
{
    Task<CreateTransactionDto> ParseTransactionAsync(string input, int groupId, int userId);
}
