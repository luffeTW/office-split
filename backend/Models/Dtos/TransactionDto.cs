using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class TransactionDto
{
    public int Id { get; set; }
    public int GroupId { get; set; }
    public string? GroupName { get; set; }
    public int UserId { get; set; }
    public string? UserName { get; set; }
    public int CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public string? CategoryIcon { get; set; }
    public decimal Amount { get; set; }
    public string? Description { get; set; }
    public DateTime Date { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<SplitDto>? Splits { get; set; }
}

public class CreateTransactionDto
{
    [Range(1, int.MaxValue, ErrorMessage = "請選擇有效的群組")]
    public int GroupId { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "請選擇有效的分類")]
    public int CategoryId { get; set; }

    [Range(typeof(decimal), "0.01", "79228162514264337593543950335", ErrorMessage = "金額需大於 0")]
    public decimal Amount { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }

    public DateTime Date { get; set; } = DateTime.UtcNow;

    // 若為 null，則預設平均分攤給群組所有成員
    public List<int>? SplitUserIds { get; set; }

    public bool SplitEqually { get; set; } = true;
}

public class UpdateTransactionDto
{
    public int? CategoryId { get; set; }
    public decimal? Amount { get; set; }
    public string? Description { get; set; }
    public DateTime? Date { get; set; }
}

public class SplitDto
{
    public int Id { get; set; }
    public int TransactionId { get; set; }
    public int UserId { get; set; }
    public string? UserName { get; set; }
    public decimal Amount { get; set; }
    public bool IsPaid { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class UpdateSplitDto
{
    public bool IsPaid { get; set; }
}
