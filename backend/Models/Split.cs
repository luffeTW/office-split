using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

public class Split
{
    public int Id { get; set; }
    
    [Required]
    public int TransactionId { get; set; }
    
    [Required]
    public int UserId { get; set; }
    
    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }
    
    public bool IsPaid { get; set; } = false;
    
    public DateTime? PaidAt { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public virtual Transaction Transaction { get; set; } = null!;
    public virtual User User { get; set; } = null!;
}
