using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

public class Transaction
{
    public int Id { get; set; }
    
    [Required]
    public int GroupId { get; set; }
    
    [Required]
    public int UserId { get; set; }
    
    [Required]
    public int CategoryId { get; set; }
    
    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }
    
    [MaxLength(500)]
    public string? Description { get; set; }
    
    [Required]
    public DateTime Date { get; set; } = DateTime.UtcNow;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // 上傳收據檔案網址（相對或絕對）
    public string? ReceiptUrl { get; set; }
    
    // Navigation properties
    public virtual Group Group { get; set; } = null!;
    public virtual User User { get; set; } = null!;
    public virtual Category Category { get; set; } = null!;
    public virtual ICollection<Split> Splits { get; set; } = new List<Split>();
}
