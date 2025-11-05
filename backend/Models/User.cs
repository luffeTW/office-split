using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class User
{
    public int Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Username { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(100)]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    public string PasswordHash { get; set; } = string.Empty;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public virtual ICollection<GroupMember> GroupMembers { get; set; } = new List<GroupMember>();
    public virtual ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
    public virtual ICollection<Split> Splits { get; set; } = new List<Split>();
}
