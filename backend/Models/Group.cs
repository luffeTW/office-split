using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class Group
{
    public int Id { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string? Description { get; set; }
    
    [Required]
    public int CreatedBy { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public virtual User Creator { get; set; } = null!;
    public virtual ICollection<GroupMember> Members { get; set; } = new List<GroupMember>();
    public virtual ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
