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
    public string? ReceiptUrl { get; set; }
    public List<SplitDto>? Splits { get; set; }
}

public class CreateTransactionDto
{
    [Range(1, int.MaxValue, ErrorMessage = "請選擇有效的群組")]
    public int GroupId { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "請選擇有效的分類")]
    public int CategoryId { get; set; }

    // 必填：指定墊款者（付款人）
    [Range(1, int.MaxValue, ErrorMessage = "請選擇有效的墊款者")]
    public int PayerUserId { get; set; }

    // 必填：指定借款者（需為群組成員，且不得與墊款者相同）
    [Range(1, int.MaxValue, ErrorMessage = "請選擇有效的借款者")]
    public int BorrowerUserId { get; set; }

    [Range(typeof(decimal), "0.01", "79228162514264337593543950335", ErrorMessage = "金額需大於 0")]
    public decimal Amount { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }

    public DateTime Date { get; set; } = DateTime.UtcNow;

    // 單純紀錄墊款，忽略分攤設定
    public List<int>? SplitUserIds { get; set; }

    public bool SplitEqually { get; set; } = true;

    // 可選：若有先上傳收據，可傳其網址
    public string? ReceiptUrl { get; set; }
}

public class UpdateTransactionDto
{
    public int? CategoryId { get; set; }
    public decimal? Amount { get; set; }
    public string? Description { get; set; }
    public DateTime? Date { get; set; }
    public int? PayerUserId { get; set; }
    public int? BorrowerUserId { get; set; }
    public string? ReceiptUrl { get; set; }
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
