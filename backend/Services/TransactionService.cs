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

        var transaction = new Transaction
        {
            GroupId = createDto.GroupId,
            UserId = userId,
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

        // Create splits
        var groupMembers = await _context.GroupMembers
            .Where(gm => gm.GroupId == createDto.GroupId)
            .Select(gm => gm.UserId)
            .ToListAsync();

        // 僅允許分攤給群組內成員
        var splitUserIds = (createDto.SplitUserIds ?? groupMembers)
            .Where(id => groupMembers.Contains(id))
            .Distinct()
            .ToList();
        if (!splitUserIds.Any())
            splitUserIds = new List<int> { userId };

        // 目前僅支援平均分攤，若未指定則預設平均
        var count = splitUserIds.Count;
        var baseAmount = Math.Round(createDto.Amount / count, 2, MidpointRounding.AwayFromZero);
        var total = baseAmount * count;
        var diff = createDto.Amount - total; // 調整四捨五入誤差

        var amounts = Enumerable.Repeat(baseAmount, count).ToArray();
        if (diff != 0)
        {
            amounts[0] = Math.Round(amounts[0] + diff, 2, MidpointRounding.AwayFromZero);
        }

        var splits = splitUserIds.Select((splitUserId, index) => new Split
        {
            TransactionId = transaction.Id,
            UserId = splitUserId,
            Amount = amounts[index],
            IsPaid = splitUserId == userId, // 建立者自己標記為已支付
            PaidAt = splitUserId == userId ? DateTime.UtcNow : null,
            CreatedAt = DateTime.UtcNow
        });

        _context.Splits.AddRange(splits);
        await _context.SaveChangesAsync();

        return await GetTransactionByIdAsync(transaction.Id, userId) ?? throw new Exception("創建交易失敗");
    }

    public async Task<TransactionDto?> UpdateTransactionAsync(int id, UpdateTransactionDto updateDto, int userId)
    {
        var transaction = await _context.Transactions
            .Include(t => t.Splits)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (transaction == null)
            return null;

        var isMember = await _groupService.IsUserMemberOfGroupAsync(transaction.GroupId, userId);
        if (!isMember)
            throw new UnauthorizedAccessException("無權限修改此交易");

        // Only creator can update
        if (transaction.UserId != userId)
            throw new UnauthorizedAccessException("只有創建者可以修改交易");

        if (updateDto.CategoryId.HasValue)
            transaction.CategoryId = updateDto.CategoryId.Value;

        if (updateDto.Amount.HasValue)
        {
            transaction.Amount = updateDto.Amount.Value;
            // Update splits proportionally
            var totalSplitAmount = transaction.Splits.Sum(s => s.Amount);
            if (totalSplitAmount > 0)
            {
                var ratio = updateDto.Amount.Value / totalSplitAmount;
                foreach (var split in transaction.Splits)
                {
                    split.Amount = split.Amount * ratio;
                }
            }
        }

        if (!string.IsNullOrEmpty(updateDto.Description))
            transaction.Description = updateDto.Description;

        if (updateDto.Date.HasValue)
        {
            var d = updateDto.Date.Value;
            transaction.Date = d.Kind == DateTimeKind.Utc ? d : DateTime.SpecifyKind(d, DateTimeKind.Utc);
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
}
