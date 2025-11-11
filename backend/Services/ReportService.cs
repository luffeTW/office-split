using System.Text;
using Microsoft.EntityFrameworkCore;
using ClosedXML.Excel;
using backend.Data;
using backend.Models;

namespace backend.Services;

public class ReportService : IReportService
{
    private readonly ApplicationDbContext _context;
    private readonly IGroupService _groupService;

    public ReportService(ApplicationDbContext context, IGroupService groupService)
    {
        _context = context;
        _groupService = groupService;
    }

    public async Task<ReportDto> GetGroupReportAsync(int groupId, int userId, DateTime? startDate = null, DateTime? endDate = null, int? categoryId = null)
    {
        var isMember = await _groupService.IsUserMemberOfGroupAsync(groupId, userId);
        if (!isMember)
            throw new UnauthorizedAccessException("無權限查看此群組的報表");

        // Normalize date filters to UTC day boundaries: start inclusive, end exclusive
        DateTime? startInclusiveUtc = startDate.HasValue
            ? DateTime.SpecifyKind(startDate.Value.Date, DateTimeKind.Utc)
            : (DateTime?)null;
        DateTime? endExclusiveUtc = endDate.HasValue
            ? DateTime.SpecifyKind(endDate.Value.Date.AddDays(1), DateTimeKind.Utc)
            : (DateTime?)null;

        var query = _context.Transactions
            .Where(t => t.GroupId == groupId)
            .Include(t => t.Category)
            .Include(t => t.Splits)
            .AsQueryable();

        if (startInclusiveUtc.HasValue)
            query = query.Where(t => t.Date >= startInclusiveUtc.Value);

        if (endExclusiveUtc.HasValue)
            query = query.Where(t => t.Date < endExclusiveUtc.Value);

        if (categoryId.HasValue)
            query = query.Where(t => t.CategoryId == categoryId.Value);

        var transactions = await query.ToListAsync();

        var totalIncome = transactions
            .Where(t => t.Category.Type == "Income")
            .Sum(t => t.Amount);

        var totalExpense = transactions
            .Where(t => t.Category.Type == "Expense")
            .Sum(t => t.Amount);

        var balance = totalIncome - totalExpense;

        // Category summaries
        var categorySummaries = transactions
            .GroupBy(t => new { t.CategoryId, t.Category.Name, t.Category.Type })
            .Select(g => new CategorySummaryDto
            {
                CategoryId = g.Key.CategoryId,
                CategoryName = g.Key.Name,
                CategoryType = g.Key.Type,
                TotalAmount = g.Sum(t => t.Amount),
                TransactionCount = g.Count()
            })
            .ToList();

        // Monthly summaries
        var monthlySummaries = transactions
            .GroupBy(t => new { t.Date.Year, t.Date.Month })
            .Select(g => new MonthlySummaryDto
            {
                Year = g.Key.Year,
                Month = g.Key.Month,
                Income = g.Where(t => t.Category.Type == "Income").Sum(t => t.Amount),
                Expense = g.Where(t => t.Category.Type == "Expense").Sum(t => t.Amount),
                Balance = g.Where(t => t.Category.Type == "Income").Sum(t => t.Amount) -
                         g.Where(t => t.Category.Type == "Expense").Sum(t => t.Amount)
            })
            .OrderBy(m => m.Year)
            .ThenBy(m => m.Month)
            .ToList();

        // User balances
        var userBalanceQuery = _context.Splits
            .Where(s => s.Transaction.GroupId == groupId &&
                       (startInclusiveUtc == null || s.Transaction.Date >= startInclusiveUtc) &&
                       (endExclusiveUtc == null || s.Transaction.Date < endExclusiveUtc));

        if (categoryId.HasValue)
            userBalanceQuery = userBalanceQuery.Where(s => s.Transaction.CategoryId == categoryId.Value);

        var userBalances = await userBalanceQuery
            .Include(s => s.User)
            .Include(s => s.Transaction)
            .GroupBy(s => new { s.UserId, s.User.Username })
            .Select(g => new UserBalanceDto
            {
                UserId = g.Key.UserId,
                Username = g.Key.Username,
                TotalPaid = g.Where(s => s.IsPaid).Sum(s => s.Amount),
                TotalOwed = g.Sum(s => s.Amount),
                Balance = g.Where(s => s.IsPaid).Sum(s => s.Amount) - g.Sum(s => s.Amount)
            })
            .ToListAsync();

        return new ReportDto
        {
            TotalIncome = totalIncome,
            TotalExpense = totalExpense,
            Balance = balance,
            CategorySummaries = categorySummaries,
            MonthlySummaries = monthlySummaries,
            UserBalances = userBalances
        };
    }

    public async Task<MyDebtsDto> GetMyDebtsAsync(int groupId, int userId, DateTime? startDate = null, DateTime? endDate = null, int? categoryId = null)
    {
        var isMember = await _groupService.IsUserMemberOfGroupAsync(groupId, userId);
        if (!isMember)
            throw new UnauthorizedAccessException("無權限查看此群組的帳務");

        // Normalize date filters to UTC day boundaries
        DateTime? startInclusiveUtc = startDate.HasValue
            ? DateTime.SpecifyKind(startDate.Value.Date, DateTimeKind.Utc)
            : (DateTime?)null;
        DateTime? endExclusiveUtc = endDate.HasValue
            ? DateTime.SpecifyKind(endDate.Value.Date.AddDays(1), DateTimeKind.Utc)
            : (DateTime?)null;

        var splitsQuery = _context.Splits
            .Where(s => s.Transaction.GroupId == groupId &&
                   (startInclusiveUtc == null || s.Transaction.Date >= startInclusiveUtc) &&
                   (endExclusiveUtc == null || s.Transaction.Date < endExclusiveUtc));

        if (categoryId.HasValue)
            splitsQuery = splitsQuery.Where(s => s.Transaction.CategoryId == categoryId.Value);

        var splits = await splitsQuery
            .Include(s => s.User) // 借款者
            .Include(s => s.Transaction)
                .ThenInclude(t => t.User) // 墊款者
            .ToListAsync();

        // 我欠別人：當我為借款者，對方為墊款者
        var iOwe = splits
            .Where(s => s.UserId == userId && s.Transaction.UserId != userId)
            .GroupBy(s => new { OtherId = s.Transaction.UserId, OtherName = s.Transaction.User.Username })
            .Select(g => new PairwiseDebtDto
            {
                UserId = g.Key.OtherId,
                Username = g.Key.OtherName,
                Amount = g.Sum(x => x.Amount)
            })
            .OrderByDescending(x => x.Amount)
            .ToList();

        // 別人欠我：當我是墊款者，對方為借款者
        var oweMe = splits
            .Where(s => s.Transaction.UserId == userId && s.UserId != userId)
            .GroupBy(s => new { OtherId = s.UserId, OtherName = s.User.Username })
            .Select(g => new PairwiseDebtDto
            {
                UserId = g.Key.OtherId,
                Username = g.Key.OtherName,
                Amount = g.Sum(x => x.Amount)
            })
            .OrderByDescending(x => x.Amount)
            .ToList();

        return new MyDebtsDto
        {
            IOwe = iOwe,
            OweMe = oweMe
        };
    }

    public async Task<byte[]> ExportReportToCsvAsync(int groupId, int userId, DateTime? startDate = null, DateTime? endDate = null, int? categoryId = null)
    {
        var isMember = await _groupService.IsUserMemberOfGroupAsync(groupId, userId);
        if (!isMember)
            throw new UnauthorizedAccessException("無權限匯出此群組的報表");

        // Normalize date filters to UTC day boundaries
        DateTime? startInclusiveUtc = startDate.HasValue
            ? DateTime.SpecifyKind(startDate.Value.Date, DateTimeKind.Utc)
            : (DateTime?)null;
        DateTime? endExclusiveUtc = endDate.HasValue
            ? DateTime.SpecifyKind(endDate.Value.Date.AddDays(1), DateTimeKind.Utc)
            : (DateTime?)null;

        var query = _context.Transactions
            .Where(t => t.GroupId == groupId)
            .Include(t => t.User)
            .Include(t => t.Category)
            .Include(t => t.Group)
            .AsQueryable();

        if (startInclusiveUtc.HasValue)
            query = query.Where(t => t.Date >= startInclusiveUtc.Value);

        if (endExclusiveUtc.HasValue)
            query = query.Where(t => t.Date < endExclusiveUtc.Value);

        if (categoryId.HasValue)
            query = query.Where(t => t.CategoryId == categoryId.Value);

        var transactions = await query
            .OrderBy(t => t.Date)
            .ToListAsync();

        var csv = new StringBuilder();
        csv.AppendLine("日期,類別,類型,金額,描述,建立者");

        foreach (var transaction in transactions)
        {
            csv.AppendLine($"{transaction.Date:yyyy-MM-dd},{transaction.Category.Name},{transaction.Category.Type},{transaction.Amount},{transaction.Description ?? ""},{transaction.User.Username}");
        }

        return Encoding.UTF8.GetBytes(csv.ToString());
    }

    public async Task<byte[]> ExportReportToExcelAsync(int groupId, int userId, DateTime? startDate = null, DateTime? endDate = null, int? categoryId = null)
    {
        var isMember = await _groupService.IsUserMemberOfGroupAsync(groupId, userId);
        if (!isMember)
            throw new UnauthorizedAccessException("無權限匯出此群組的報表");

        // Normalize date filters to UTC day boundaries
        DateTime? startInclusiveUtc = startDate.HasValue
            ? DateTime.SpecifyKind(startDate.Value.Date, DateTimeKind.Utc)
            : (DateTime?)null;
        DateTime? endExclusiveUtc = endDate.HasValue
            ? DateTime.SpecifyKind(endDate.Value.Date.AddDays(1), DateTimeKind.Utc)
            : (DateTime?)null;

        var query = _context.Transactions
            .Where(t => t.GroupId == groupId)
            .Include(t => t.User)
            .Include(t => t.Category)
            .Include(t => t.Group)
            .Include(t => t.Splits)
                .ThenInclude(s => s.User)
            .AsQueryable();

        if (startInclusiveUtc.HasValue)
            query = query.Where(t => t.Date >= startInclusiveUtc.Value);

        if (endExclusiveUtc.HasValue)
            query = query.Where(t => t.Date < endExclusiveUtc.Value);

        if (categoryId.HasValue)
            query = query.Where(t => t.CategoryId == categoryId.Value);

        var transactions = await query
            .OrderBy(t => t.Date)
            .ToListAsync();

        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("交易記錄");

        // Headers
        worksheet.Cell(1, 1).Value = "日期";
        worksheet.Cell(1, 2).Value = "類別";
        worksheet.Cell(1, 3).Value = "類型";
        worksheet.Cell(1, 4).Value = "金額";
        worksheet.Cell(1, 5).Value = "描述";
        worksheet.Cell(1, 6).Value = "建立者";
        worksheet.Cell(1, 7).Value = "分帳明細";

        // Style headers
        var headerRange = worksheet.Range(1, 1, 1, 7);
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Fill.BackgroundColor = XLColor.LightGray;

        int row = 2;
        foreach (var transaction in transactions)
        {
            worksheet.Cell(row, 1).Value = transaction.Date.ToString("yyyy-MM-dd");
            worksheet.Cell(row, 2).Value = transaction.Category.Name;
            worksheet.Cell(row, 3).Value = transaction.Category.Type;
            worksheet.Cell(row, 4).Value = transaction.Amount;
            worksheet.Cell(row, 5).Value = transaction.Description ?? "";
            worksheet.Cell(row, 6).Value = transaction.User.Username;
            
            var splitDetails = string.Join(", ", transaction.Splits.Select(s => 
                $"{s.User.Username}: {s.Amount} {(s.IsPaid ? "已付" : "未付")}"));
            worksheet.Cell(row, 7).Value = splitDetails;

            row++;
        }

        worksheet.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }
}
