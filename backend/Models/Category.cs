using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class Category
{
    public int Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Name { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(20)]
    public string Type { get; set; } = "Expense"; // Income, Expense
    
    [MaxLength(50)]
    public string? Icon { get; set; }
    
    public int? UserId { get; set; } // null for system categories
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public virtual User? User { get; set; }
    public virtual ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
