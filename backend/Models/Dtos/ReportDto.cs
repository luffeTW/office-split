namespace backend.Models;

public class ReportDto
{
    public decimal TotalIncome { get; set; }
    public decimal TotalExpense { get; set; }
    public decimal Balance { get; set; }
    public List<CategorySummaryDto>? CategorySummaries { get; set; }
    public List<MonthlySummaryDto>? MonthlySummaries { get; set; }
    public List<UserBalanceDto>? UserBalances { get; set; }
}

public class CategorySummaryDto
{
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string CategoryType { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public int TransactionCount { get; set; }
}

public class MonthlySummaryDto
{
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal Income { get; set; }
    public decimal Expense { get; set; }
    public decimal Balance { get; set; }
}

public class UserBalanceDto
{
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public decimal TotalPaid { get; set; }
    public decimal TotalOwed { get; set; }
    public decimal Balance { get; set; }
}
