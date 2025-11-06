using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Services;

public class TransactionService : ITransactionService
{
    private readonly ApplicationDbContext _context;
    private readonly IGroupService _groupService;

    public TransactionService(ApplicationDbContext context, IGroupService groupService)
    {
        _context = context;
        _groupService = groupService;
    }

    public async Task<List<TransactionDto>> GetTransactionsAsync(int groupId, int userId, DateTime? startDate = null, DateTime? endDate = null)
    {
        var isMember = await _groupService.IsUserMemberOfGroupAsync(groupId, userId);
        if (!isMember)
            throw new UnauthorizedAccessException("無權限查看此群組的交易");

        var query = _context.Transactions
            .Where(t => t.GroupId == groupId)
            .Include(t => t.User)
            .Include(t => t.Category)
            .Include(t => t.Group)
            .Include(t => t.Splits)
                .ThenInclude(s => s.User)
            .AsQueryable();

        if (startDate.HasValue)
            query = query.Where(t => t.Date >= startDate.Value);

        if (endDate.HasValue)
            query = query.Where(t => t.Date <= endDate.Value);

        return await query
            .OrderByDescending(t => t.Date)
            .ThenByDescending(t => t.CreatedAt)
            .Select(t => new TransactionDto
            {
                Id = t.Id,
                GroupId = t.GroupId,
                GroupName = t.Group.Name,
                UserId = t.UserId,
                UserName = t.User.Username,
                CategoryId = t.CategoryId,
                CategoryName = t.Category.Name,
                CategoryIcon = t.Category.Icon,
                Amount = t.Amount,
                Description = t.Description,
                Date = t.Date,
                CreatedAt = t.CreatedAt,
                Splits = t.Splits.Select(s => new SplitDto
                {
                    Id = s.Id,
                    TransactionId = s.TransactionId,
                    UserId = s.UserId,
                    UserName = s.User.Username,
                    Amount = s.Amount,
                    IsPaid = s.IsPaid,
                    PaidAt = s.PaidAt,
                    CreatedAt = s.CreatedAt
                }).ToList()
            })
            .ToListAsync();
    }

    public async Task<TransactionDto?> GetTransactionByIdAsync(int id, int userId)
    {
        var transaction = await _context.Transactions
            .Include(t => t.User)
            .Include(t => t.Category)
            .Include(t => t.Group)
            .Include(t => t.Splits)
                .ThenInclude(s => s.User)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (transaction == null)
            return null;

        var isMember = await _groupService.IsUserMemberOfGroupAsync(transaction.GroupId, userId);
        if (!isMember)
            throw new UnauthorizedAccessException("無權限查看此交易");

        return new TransactionDto
        {
            Id = transaction.Id,
            GroupId = transaction.GroupId,
            GroupName = transaction.Group.Name,
            UserId = transaction.UserId,
            UserName = transaction.User.Username,
            CategoryId = transaction.CategoryId,
            CategoryName = transaction.Category.Name,
            CategoryIcon = transaction.Category.Icon,
            Amount = transaction.Amount,
            Description = transaction.Description,
            Date = transaction.Date,
            CreatedAt = transaction.CreatedAt,
            Splits = transaction.Splits.Select(s => new SplitDto
            {
                Id = s.Id,
                TransactionId = s.TransactionId,
                UserId = s.UserId,
                UserName = s.User.Username,
                Amount = s.Amount,
                IsPaid = s.IsPaid,
                PaidAt = s.PaidAt,
                CreatedAt = s.CreatedAt
            }).ToList()
        };
    }

    public async Task<TransactionDto> CreateTransactionAsync(CreateTransactionDto createDto, int userId)
    {
        var isMember = await _groupService.IsUserMemberOfGroupAsync(createDto.GroupId, userId);
        if (!isMember)
            throw new UnauthorizedAccessException("無權限在此群組創建交易");

        if (createDto.Amount <= 0)
            throw new Exception("金額需大於 0");

        var category = await _context.Categories.FindAsync(createDto.CategoryId);
        if (category == null)
            throw new Exception("分類不存在");

        // 必須指定墊款者與借款者
        var payerUserId = createDto.PayerUserId;
        var borrowerUserId = createDto.BorrowerUserId;

        if (payerUserId == borrowerUserId)
            throw new Exception("墊款者與借款者不可相同");

        // 驗證雙方皆為群組成員
        var isPayerMember = await _groupService.IsUserMemberOfGroupAsync(createDto.GroupId, payerUserId);
        if (!isPayerMember)
            throw new Exception("墊款者必須是群組成員");
        var isBorrowerMember = await _groupService.IsUserMemberOfGroupAsync(createDto.GroupId, borrowerUserId);
        if (!isBorrowerMember)
            throw new Exception("借款者必須是群組成員");

        var transaction = new Transaction
        {
            GroupId = createDto.GroupId,
            UserId = payerUserId,
            CategoryId = createDto.CategoryId,
            Amount = createDto.Amount,
            Description = createDto.Description,
            Date = createDto.Date.Kind == DateTimeKind.Utc
                ? createDto.Date
                : DateTime.SpecifyKind(createDto.Date, DateTimeKind.Utc),
            CreatedAt = DateTime.UtcNow
        };

        _context.Transactions.Add(transaction);
        await _context.SaveChangesAsync();

        // 新邏輯：此筆交易只代表「借款者欠墊款者」的整筆金額
        var split = new Split
        {
            TransactionId = transaction.Id,
            UserId = borrowerUserId,
            Amount = transaction.Amount,
            IsPaid = false,
            PaidAt = null,
            CreatedAt = DateTime.UtcNow
        };

        _context.Splits.Add(split);
        await _context.SaveChangesAsync();

        return await GetTransactionByIdAsync(transaction.Id, userId) ?? throw new Exception("創建交易失敗");
    }

    public async Task<TransactionDto?> UpdateTransactionAsync(int id, UpdateTransactionDto updateDto, int userId)
    {
        var transaction = await _context.Transactions
            .Include(t => t.Splits)
            .Include(t => t.Group)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (transaction == null)
            return null;

        var isMember = await _groupService.IsUserMemberOfGroupAsync(transaction.GroupId, userId);
        if (!isMember)
            throw new UnauthorizedAccessException("無權限修改此交易");

        // Only creator can update（以變更前付款者為準）
        if (transaction.UserId != userId)
            throw new UnauthorizedAccessException("只有創建者(墊款者)可以修改交易");

        if (updateDto.CategoryId.HasValue)
            transaction.CategoryId = updateDto.CategoryId.Value;

        // 更新付款者/借款者（若提供）
        int currentBorrowerId = transaction.Splits.FirstOrDefault()?.UserId ?? 0;
        if (updateDto.PayerUserId.HasValue)
        {
            // 驗證為群組成員
            var isMemberPayer = await _groupService.IsUserMemberOfGroupAsync(transaction.GroupId, updateDto.PayerUserId.Value);
            if (!isMemberPayer) throw new Exception("新的墊款者必須是群組成員");
            transaction.UserId = updateDto.PayerUserId.Value;
        }
        if (updateDto.BorrowerUserId.HasValue)
        {
            // 驗證為群組成員
            var isMemberBorrower = await _groupService.IsUserMemberOfGroupAsync(transaction.GroupId, updateDto.BorrowerUserId.Value);
            if (!isMemberBorrower) throw new Exception("新的借款者必須是群組成員");
            currentBorrowerId = updateDto.BorrowerUserId.Value;
        }
        if (transaction.UserId == currentBorrowerId)
            throw new Exception("墊款者與借款者不可相同");

        if (updateDto.Amount.HasValue)
        {
            transaction.Amount = updateDto.Amount.Value;
        }

        if (!string.IsNullOrEmpty(updateDto.Description))
            transaction.Description = updateDto.Description;

        if (updateDto.Date.HasValue)
        {
            var d = updateDto.Date.Value;
            transaction.Date = d.Kind == DateTimeKind.Utc ? d : DateTime.SpecifyKind(d, DateTimeKind.Utc);
        }

        // 維持單一分帳模型：只有一個借款者 split
        var splitEntity = transaction.Splits.FirstOrDefault();
        if (splitEntity == null)
        {
            splitEntity = new Split
            {
                TransactionId = transaction.Id,
                UserId = currentBorrowerId,
                Amount = transaction.Amount,
                IsPaid = false,
                PaidAt = null,
                CreatedAt = DateTime.UtcNow
            };
            _context.Splits.Add(splitEntity);
        }
        else
        {
            bool resetPaid = false;
            if (splitEntity.UserId != currentBorrowerId)
            {
                splitEntity.UserId = currentBorrowerId;
                resetPaid = true;
            }
            if (updateDto.Amount.HasValue && splitEntity.Amount != transaction.Amount)
            {
                splitEntity.Amount = transaction.Amount;
                resetPaid = true;
            }
            if (resetPaid)
            {
                splitEntity.IsPaid = false;
                splitEntity.PaidAt = null;
            }
        }

        await _context.SaveChangesAsync();
        return await GetTransactionByIdAsync(id, userId);
    }

    public async Task<bool> DeleteTransactionAsync(int id, int userId)
    {
        var transaction = await _context.Transactions.FindAsync(id);
        if (transaction == null)
            return false;

        var isMember = await _groupService.IsUserMemberOfGroupAsync(transaction.GroupId, userId);
        if (!isMember)
            throw new UnauthorizedAccessException("無權限刪除此交易");

        // Only creator can delete
        if (transaction.UserId != userId)
            throw new UnauthorizedAccessException("只有創建者可以刪除交易");

        _context.Transactions.Remove(transaction);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<SplitDto>> GetTransactionSplitsAsync(int transactionId, int userId)
    {
        var transaction = await _context.Transactions.FindAsync(transactionId);
        if (transaction == null)
            throw new Exception("交易不存在");

        var isMember = await _groupService.IsUserMemberOfGroupAsync(transaction.GroupId, userId);
        if (!isMember)
            throw new UnauthorizedAccessException("無權限查看此交易的分帳");

        return await _context.Splits
            .Where(s => s.TransactionId == transactionId)
            .Include(s => s.User)
            .Select(s => new SplitDto
            {
                Id = s.Id,
                TransactionId = s.TransactionId,
                UserId = s.UserId,
                UserName = s.User.Username,
                Amount = s.Amount,
                IsPaid = s.IsPaid,
                PaidAt = s.PaidAt,
                CreatedAt = s.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<SplitDto?> UpdateSplitAsync(int splitId, UpdateSplitDto updateDto, int userId)
    {
        var split = await _context.Splits
            .Include(s => s.Transaction)
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.Id == splitId);

        if (split == null)
            return null;

        var isMember = await _groupService.IsUserMemberOfGroupAsync(split.Transaction.GroupId, userId);
        if (!isMember)
            throw new UnauthorizedAccessException("無權限修改此分帳");

        split.IsPaid = updateDto.IsPaid;
        split.PaidAt = updateDto.IsPaid ? DateTime.UtcNow : null;

        await _context.SaveChangesAsync();

        return new SplitDto
        {
            Id = split.Id,
            TransactionId = split.TransactionId,
            UserId = split.UserId,
            UserName = split.User.Username,
            Amount = split.Amount,
            IsPaid = split.IsPaid,
            PaidAt = split.PaidAt,
            CreatedAt = split.CreatedAt
        };
    }

    public async Task<int> SettlePairDebtsAsync(int groupId, int userId, int otherUserId, string direction, DateTime? upToDate = null)
    {
        // 驗證雙方皆為群組成員
        var isMeMember = await _groupService.IsUserMemberOfGroupAsync(groupId, userId);
        var isOtherMember = await _groupService.IsUserMemberOfGroupAsync(groupId, otherUserId);
        if (!isMeMember || !isOtherMember)
            throw new UnauthorizedAccessException("雙方必須皆為群組成員");

        var now = DateTime.UtcNow;
        IQueryable<Split> query = _context.Splits
            .Include(s => s.Transaction)
            .Where(s => s.Transaction.GroupId == groupId && !s.IsPaid);

        if (upToDate.HasValue)
        {
            var cutoff = upToDate.Value.Kind == DateTimeKind.Utc ? upToDate.Value : DateTime.SpecifyKind(upToDate.Value, DateTimeKind.Utc);
            query = query.Where(s => s.Transaction.Date <= cutoff);
        }

        if (string.Equals(direction, "IOwe", StringComparison.OrdinalIgnoreCase))
        {
            // 我欠別人：我為借款者，他為墊款者
            query = query.Where(s => s.UserId == userId && s.Transaction.UserId == otherUserId);
        }
        else if (string.Equals(direction, "OweMe", StringComparison.OrdinalIgnoreCase))
        {
            // 別人欠我：他為借款者，我為墊款者
            query = query.Where(s => s.UserId == otherUserId && s.Transaction.UserId == userId);
        }
        else
        {
            throw new Exception("direction 必須為 IOwe 或 OweMe");
        }

        var splits = await query.ToListAsync();
        foreach (var s in splits)
        {
            s.IsPaid = true;
            s.PaidAt = now;
        }
        await _context.SaveChangesAsync();
        return splits.Count;
    }
}
